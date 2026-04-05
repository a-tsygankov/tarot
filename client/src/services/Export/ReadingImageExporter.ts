import { getCardArt } from '../../ui/components/card-art-registry.js';

export interface ReadingExportCard {
    name: string;
    position: string;
    reversed: boolean;
}

export interface ReadingExportInput {
    title: string;
    subtitle: string;
    overallReading: string;
    cards: ReadingExportCard[];
}

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1350;
const FRAME_MARGIN = 42;
const FRAME_BORDER = 6;
const FRAME_PADDING_X = 58;
const FRAME_PADDING_TOP = 52;
const FRAME_PADDING_BOTTOM = 54;
const SAFE_LEFT = FRAME_MARGIN + FRAME_BORDER + FRAME_PADDING_X;
const SAFE_TOP = FRAME_MARGIN + FRAME_BORDER + FRAME_PADDING_TOP;
const SAFE_RIGHT = CANVAS_WIDTH - FRAME_MARGIN - FRAME_BORDER - FRAME_PADDING_X;
const SAFE_BOTTOM = CANVAS_HEIGHT - FRAME_MARGIN - FRAME_BORDER - FRAME_PADDING_BOTTOM;
const CONTENT_WIDTH = SAFE_RIGHT - SAFE_LEFT;
const HERO_TOP = SAFE_TOP + 78;
const HERO_GAP = 36;
const SPREAD_SECTION_MIN_HEIGHT = 180;
const MAX_VISIBLE_CARDS = 5;
const CARD_ASPECT_RATIO = 200 / 345;
const WATERMARK_HEIGHT = 34;

export class ReadingImageExporter {
    async exportBlob(input: ReadingExportInput): Promise<Blob | null> {
        const canvas = document.createElement('canvas');
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
        const context = canvas.getContext('2d');
        if (!context) {
            return null;
        }

        this.paintBackground(context);
        this.paintFrame(context);
        this.paintHeader(context, input.title, input.subtitle);

        const cardColumnWidth = this.resolveCardColumnWidth(input);
        const textColumnWidth = CONTENT_WIDTH - cardColumnWidth - HERO_GAP;
        const cardBlock = {
            x: SAFE_LEFT,
            y: HERO_TOP,
            width: cardColumnWidth,
            height: this.resolveCardBlockHeight(cardColumnWidth, input.cards.length),
        };

        const spreadTop = SAFE_BOTTOM - WATERMARK_HEIGHT - SPREAD_SECTION_MIN_HEIGHT;
        const textStartX = cardBlock.x + cardBlock.width + HERO_GAP;
        const textTop = HERO_TOP + 4;

        const besideLines = this.wrapText(
            context,
            input.overallReading,
            textColumnWidth,
        );
        const besideLineHeight = 42;
        const besideCapacity = Math.max(
            4,
            Math.floor((cardBlock.height - 18) / besideLineHeight),
        );
        const initialLines = besideLines.slice(0, besideCapacity);
        const remainingText = besideLines.slice(besideCapacity).join(' ');

        await this.paintCardBlock(context, input.cards.slice(0, MAX_VISIBLE_CARDS), cardBlock);
        this.paintReadingLines(context, initialLines, textStartX, textTop, besideLineHeight);

        const remainingTop = Math.max(
            cardBlock.y + cardBlock.height + 34,
            textTop + initialLines.length * besideLineHeight + 22,
        );
        const spreadSummaryLines = this.wrapText(
            context,
            this.buildSpreadSummary(input.cards),
            CONTENT_WIDTH,
            6,
            '600 23px Georgia, serif',
        );
        const spreadHeight = this.measureTextHeight(spreadSummaryLines.length, 31) + 48;
        const spreadY = Math.max(spreadTop, SAFE_BOTTOM - WATERMARK_HEIGHT - spreadHeight);

        const remainingAreaHeight = Math.max(0, spreadY - remainingTop - 28);
        const fullWidthLines = remainingText
            ? this.wrapText(context, remainingText, CONTENT_WIDTH)
            : [];
        const fullWidthLineHeight = 37;
        const fullWidthCapacity = Math.max(0, Math.floor(remainingAreaHeight / fullWidthLineHeight));
        const bodyLines = fullWidthLines.slice(0, fullWidthCapacity);
        if (fullWidthLines.length > fullWidthCapacity && bodyLines.length > 0) {
            bodyLines[bodyLines.length - 1] = this.withEllipsis(bodyLines[bodyLines.length - 1]);
        }

        this.paintReadingLines(context, bodyLines, SAFE_LEFT, remainingTop, fullWidthLineHeight);
        this.paintSpreadSection(context, spreadY, spreadSummaryLines);
        this.paintWatermark(context, this.resolveAppUrl());

        return await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    }

    private paintBackground(context: CanvasRenderingContext2D): void {
        const gradient = context.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        gradient.addColorStop(0, '#150a22');
        gradient.addColorStop(0.42, '#241138');
        gradient.addColorStop(1, '#2c1642');
        context.fillStyle = gradient;
        context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        context.fillStyle = 'rgba(255,255,255,0.035)';
        for (let i = 0; i < 22; i += 1) {
            context.beginPath();
            context.arc(
                48 + ((i * 139) % (CANVAS_WIDTH - 96)),
                44 + ((i * 193) % (CANVAS_HEIGHT - 88)),
                1.5 + (i % 3),
                0,
                Math.PI * 2,
            );
            context.fill();
        }
    }

    private paintFrame(context: CanvasRenderingContext2D): void {
        const frameX = FRAME_MARGIN;
        const frameY = FRAME_MARGIN;
        const frameWidth = CANVAS_WIDTH - FRAME_MARGIN * 2;
        const frameHeight = CANVAS_HEIGHT - FRAME_MARGIN * 2;

        context.save();
        context.strokeStyle = 'rgba(225, 194, 113, 0.82)';
        context.lineWidth = FRAME_BORDER;
        context.strokeRect(frameX, frameY, frameWidth, frameHeight);

        context.strokeStyle = 'rgba(225, 194, 113, 0.28)';
        context.lineWidth = 1;
        context.strokeRect(frameX + 12, frameY + 12, frameWidth - 24, frameHeight - 24);
        context.restore();
    }

    private paintHeader(context: CanvasRenderingContext2D, title: string, subtitle: string): void {
        context.fillStyle = '#e1c271';
        context.font = '700 50px Georgia, serif';
        context.fillText(title, SAFE_LEFT, SAFE_TOP + 4);
        context.fillStyle = '#efe6d2';
        context.font = '600 25px Georgia, serif';
        context.fillText(subtitle, SAFE_LEFT, SAFE_TOP + 48);
    }

    private async paintCardBlock(
        context: CanvasRenderingContext2D,
        cards: ReadingExportCard[],
        block: { x: number; y: number; width: number; height: number },
    ): Promise<void> {
        context.fillStyle = 'rgba(255,255,255,0.04)';
        context.fillRect(block.x, block.y, block.width, block.height);

        const cardCount = Math.max(1, cards.length);
        const cardWidth = Math.min(168, block.width / (cardCount <= 2 ? 2.1 : 2.8));
        const cardHeight = cardWidth / CARD_ASPECT_RATIO;
        const clusterWidth = Math.min(block.width - 52, cardWidth + (cardCount - 1) * (cardWidth * 0.56));
        const clusterStartX = block.x + Math.max(26, (block.width - clusterWidth) / 2);
        const clusterY = block.y + 30;

        for (let index = 0; index < cards.length; index += 1) {
            const card = cards[index];
            const svg = getCardArt(card.name, 260, 448);
            if (!svg) {
                continue;
            }
            const image = await this.svgToImage(svg);
            const x = clusterStartX + (index * cardWidth * 0.56);
            const y = clusterY + (index % 2 === 0 ? 14 : 0);
            const rotation = (index - (cards.length - 1) / 2) * 0.09;

            context.save();
            context.translate(x + cardWidth / 2, y + cardHeight / 2);
            context.rotate(rotation);
            context.shadowColor = 'rgba(0, 0, 0, 0.34)';
            context.shadowBlur = 20;
            context.drawImage(image, -cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight);
            context.restore();
        }

        context.fillStyle = '#d8bc74';
        context.font = '600 22px Georgia, serif';
        context.fillText('Cards Drawn', block.x + 18, block.y + block.height - 24);
    }

    private paintReadingLines(
        context: CanvasRenderingContext2D,
        lines: string[],
        x: number,
        y: number,
        lineHeight: number,
    ): void {
        context.fillStyle = '#f3ead7';
        context.font = '400 33px Georgia, serif';
        lines.forEach((line, index) => {
            context.fillText(line, x, y + index * lineHeight);
        });
    }

    private paintSpreadSection(
        context: CanvasRenderingContext2D,
        top: number,
        lines: string[],
    ): void {
        context.fillStyle = '#d8bc74';
        context.font = '600 25px Georgia, serif';
        context.fillText('Spread', SAFE_LEFT, top);

        context.fillStyle = '#efe6d2';
        context.font = '600 23px Georgia, serif';
        lines.forEach((line, index) => {
            context.fillText(line, SAFE_LEFT, top + 40 + (index * 31));
        });
    }

    private paintWatermark(context: CanvasRenderingContext2D, url: string): void {
        context.save();
        context.font = '500 17px Georgia, serif';
        const textWidth = context.measureText(url).width;
        const stampWidth = textWidth + 32;
        const stampHeight = 32;
        const x = SAFE_RIGHT - stampWidth;
        const y = SAFE_BOTTOM - stampHeight + 6;

        context.fillStyle = 'rgba(22, 11, 34, 0.94)';
        context.strokeStyle = 'rgba(225, 194, 113, 0.45)';
        context.lineWidth = 1;
        this.roundRect(context, x, y, stampWidth, stampHeight, 12);
        context.fill();
        context.stroke();

        context.fillStyle = 'rgba(239, 230, 210, 0.82)';
        context.fillText(url, x + 16, y + 21);
        context.restore();
    }

    private resolveCardColumnWidth(input: ReadingExportInput): number {
        const cardCount = Math.max(1, Math.min(MAX_VISIBLE_CARDS, input.cards.length));
        const readingLength = input.overallReading.length;
        const readingBias = readingLength > 800 ? 0.34 : readingLength > 520 ? 0.39 : 0.46;
        const cardBias = cardCount >= 5 ? 0.52 : cardCount >= 3 ? 0.45 : 0.36;
        const ratio = Math.min(0.7, Math.max(0.3, (readingBias + cardBias) / 2));
        return Math.round(CONTENT_WIDTH * ratio);
    }

    private resolveCardBlockHeight(cardColumnWidth: number, cardCount: number): number {
        const base = Math.max(250, cardColumnWidth * 0.68);
        return Math.round(base + Math.min(cardCount, 5) * 18);
    }

    private buildSpreadSummary(cards: ReadingExportCard[]): string {
        return cards
            .map(card => `${card.position}: ${card.name}${card.reversed ? ' (Reversed)' : ''}`)
            .join(' · ');
    }

    private wrapText(
        context: CanvasRenderingContext2D,
        text: string,
        maxWidth: number,
        maxLines = 999,
        font = '400 33px Georgia, serif',
    ): string[] {
        context.font = font;
        const words = text.split(/\s+/).filter(Boolean);
        const lines: string[] = [];
        let current = '';

        for (const word of words) {
            const candidate = current ? `${current} ${word}` : word;
            if (context.measureText(candidate).width <= maxWidth) {
                current = candidate;
                continue;
            }

            if (current) {
                lines.push(current);
            }
            current = word;
            if (lines.length === maxLines) {
                break;
            }
        }

        if (lines.length < maxLines && current) {
            lines.push(current);
        }

        if (lines.length > maxLines) {
            return lines.slice(0, maxLines);
        }

        return lines;
    }

    private measureTextHeight(lines: number, lineHeight: number): number {
        return Math.max(0, lines) * lineHeight;
    }

    private withEllipsis(line: string): string {
        return `${line.replace(/[. ]+$/, '')}...`;
    }

    private async svgToImage(svg: string): Promise<HTMLImageElement> {
        const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const image = new Image();
        image.decoding = 'async';
        await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () => reject(new Error('Failed to load card art'));
            image.src = url;
        });
        URL.revokeObjectURL(url);
        return image;
    }

    private resolveAppUrl(): string {
        try {
            const url = new URL(window.location.href);
            url.search = '';
            url.hash = '';
            return url.toString().replace(/\/$/, '');
        } catch {
            return window.location.origin;
        }
    }

    private roundRect(
        context: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number,
    ): void {
        context.beginPath();
        context.moveTo(x + radius, y);
        context.lineTo(x + width - radius, y);
        context.quadraticCurveTo(x + width, y, x + width, y + radius);
        context.lineTo(x + width, y + height - radius);
        context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        context.lineTo(x + radius, y + height);
        context.quadraticCurveTo(x, y + height, x, y + height - radius);
        context.lineTo(x, y + radius);
        context.quadraticCurveTo(x, y, x + radius, y);
        context.closePath();
    }
}
