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

export interface ReadingImageLayoutPlan {
    cardBlock: { x: number; y: number; width: number; height: number };
    textColumnWidth: number;
    spreadLines: string[];
    spreadLineHeight: number;
    watermarkUrl: string;
    cardStage: {
        width: number;
        height: number;
        cardWidth: number;
        cardHeight: number;
        spacing: number;
        clusterWidth: number;
        clusterStartX: number;
        clusterY: number;
        leftPadding: number;
        rightPadding: number;
    };
}

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1350;
const FRAME_MARGIN = 42;
const FRAME_BORDER = 6;
const FRAME_PADDING = 74;
const SAFE_LEFT = FRAME_MARGIN + FRAME_BORDER + FRAME_PADDING;
const SAFE_TOP = FRAME_MARGIN + FRAME_BORDER + FRAME_PADDING;
const SAFE_RIGHT = CANVAS_WIDTH - FRAME_MARGIN - FRAME_BORDER - FRAME_PADDING;
const SAFE_BOTTOM = CANVAS_HEIGHT - FRAME_MARGIN - FRAME_BORDER - FRAME_PADDING;
const CONTENT_WIDTH = SAFE_RIGHT - SAFE_LEFT;
const HERO_TOP = SAFE_TOP + 88;
const HERO_GAP = 36;
const SPREAD_SECTION_MIN_HEIGHT = 180;
const MAX_VISIBLE_CARDS = 5;
const CARD_ASPECT_RATIO = 200 / 345;
const WATERMARK_HEIGHT = 34;
const CARD_STAGE_PADDING = 28;
const CARD_STAGE_LABEL_HEIGHT = 64;

export class ReadingImageExporter {
    planLayout(input: ReadingExportInput, appUrl = this.resolveAppUrl()): ReadingImageLayoutPlan {
        const measureCanvas = document.createElement('canvas');
        const measureContext = measureCanvas.getContext('2d');
        if (!measureContext) {
            throw new Error('Canvas text context unavailable');
        }

        const cardColumnWidth = this.resolveCardColumnWidth(input);
        const cardBlock = {
            x: SAFE_LEFT,
            y: HERO_TOP,
            width: cardColumnWidth,
            height: this.resolveCardBlockHeight(cardColumnWidth, input.cards.length),
        };

        return {
            cardBlock,
            textColumnWidth: CONTENT_WIDTH - cardColumnWidth - HERO_GAP,
            spreadLines: this.wrapText(
                measureContext,
                this.buildSpreadSummary(input.cards),
                CONTENT_WIDTH,
                input.cards.length > 3 ? 3 : 6,
                '600 23px Georgia, serif',
            ),
            spreadLineHeight: input.cards.length > 3 ? 28 : 31,
            watermarkUrl: appUrl,
            cardStage: this.resolveCardStage(cardBlock, input.cards.length),
        };
    }

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

        const plan = this.planLayout(input);
        const { cardBlock, textColumnWidth } = plan;

        const spreadTop = SAFE_BOTTOM - WATERMARK_HEIGHT - SPREAD_SECTION_MIN_HEIGHT;
        const textStartX = cardBlock.x + cardBlock.width + HERO_GAP;
        const textTop = HERO_TOP + 4;

        const besideLines = this.wrapText(
            context,
            input.overallReading,
            textColumnWidth,
        );
        const besideLineHeight = 44;
        const besideCapacity = Math.max(
            4,
            Math.floor((cardBlock.height - 18) / besideLineHeight),
        );
        const initialLines = besideLines.slice(0, besideCapacity);
        const remainingText = besideLines.slice(besideCapacity).join(' ');

        await this.paintCardBlock(context, input.cards.slice(0, MAX_VISIBLE_CARDS), cardBlock, plan.cardStage);
        this.paintReadingLines(context, initialLines, textStartX, textTop, besideLineHeight, textColumnWidth, true);

        const remainingTop = Math.max(
            cardBlock.y + cardBlock.height + 42,
            textTop + initialLines.length * besideLineHeight + 22,
        );
        const spreadSummaryLines = plan.spreadLines;
        let spreadLineHeight = plan.spreadLineHeight;
        let spreadHeight = this.measureTextHeight(spreadSummaryLines.length, spreadLineHeight) + 48;
        const spreadY = Math.max(spreadTop, SAFE_BOTTOM - WATERMARK_HEIGHT - spreadHeight);

        const remainingAreaHeight = Math.max(0, spreadY - remainingTop - 28);
        const fullWidthLines = remainingText
            ? this.wrapText(context, remainingText, CONTENT_WIDTH)
            : [];
        let fullWidthLineHeight = 38;
        const fullWidthCapacity = Math.max(0, Math.floor(remainingAreaHeight / fullWidthLineHeight));
        const bodyLines = fullWidthLines.slice(0, fullWidthCapacity);
        if (fullWidthLines.length > fullWidthCapacity && bodyLines.length > 0) {
            bodyLines[bodyLines.length - 1] = this.withEllipsis(bodyLines[bodyLines.length - 1]);
        }

        const usedBodyHeight = bodyLines.length * fullWidthLineHeight;
        const usedSpreadHeight = this.measureTextHeight(spreadSummaryLines.length, spreadLineHeight) + 48;
        const freeBottomSpace = Math.max(0, (SAFE_BOTTOM - WATERMARK_HEIGHT) - (remainingTop + usedBodyHeight + 28 + usedSpreadHeight));
        if (freeBottomSpace > 18) {
            const bodyRoom = bodyLines.length > 1
                ? Math.min(10, Math.round(freeBottomSpace / Math.max(bodyLines.length + 2, 4)))
                : 0;
            fullWidthLineHeight += bodyRoom;
            const spreadRoom = spreadSummaryLines.length > 0
                ? Math.min(6, Math.round((freeBottomSpace - bodyRoom * Math.max(bodyLines.length - 1, 0)) / Math.max(spreadSummaryLines.length + 3, 4)))
                : 0;
            spreadLineHeight += Math.max(0, spreadRoom);
            spreadHeight = this.measureTextHeight(spreadSummaryLines.length, spreadLineHeight) + 48;
        }

        const adjustedSpreadY = Math.max(spreadTop, SAFE_BOTTOM - WATERMARK_HEIGHT - spreadHeight);

        this.paintReadingLines(context, bodyLines, SAFE_LEFT, remainingTop, fullWidthLineHeight, CONTENT_WIDTH, true);
        this.paintSpreadSection(context, adjustedSpreadY, spreadSummaryLines, spreadLineHeight);
        this.paintWatermark(context, plan.watermarkUrl);

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
        context.font = '700 58px Georgia, serif';
        context.fillText(title, SAFE_LEFT, SAFE_TOP + 4);
        context.fillStyle = '#efe6d2';
        context.font = '600 31px Georgia, serif';
        context.fillText(subtitle, SAFE_LEFT, SAFE_TOP + 56);
    }

    private async paintCardBlock(
        context: CanvasRenderingContext2D,
        cards: ReadingExportCard[],
        block: { x: number; y: number; width: number; height: number },
        stage: ReadingImageLayoutPlan['cardStage'],
    ): Promise<void> {
        context.fillStyle = 'rgba(255,255,255,0.04)';
        context.fillRect(block.x, block.y, block.width, block.height);

        for (let index = 0; index < cards.length; index += 1) {
            const card = cards[index];
            const svg = getCardArt(card.name, 260, 448);
            if (!svg) {
                continue;
            }
            const image = await this.svgToImage(svg);
            const x = stage.clusterStartX + (index * stage.spacing);
            const y = stage.clusterY + (index % 2 === 0 ? 14 : 0);
            const rotation = (index - (cards.length - 1) / 2) * 0.09;

            context.save();
            context.translate(x + stage.cardWidth / 2, y + stage.cardHeight / 2);
            context.rotate(rotation);
            this.paintCardMask(context, stage.cardWidth, stage.cardHeight);
            context.shadowColor = 'rgba(0, 0, 0, 0.34)';
            context.shadowBlur = 20;
            context.drawImage(image, -stage.cardWidth / 2, -stage.cardHeight / 2, stage.cardWidth, stage.cardHeight);
            context.restore();
        }

        context.fillStyle = '#d8bc74';
        context.font = '600 22px Georgia, serif';
        context.fillText('Cards Drawn', block.x + CARD_STAGE_PADDING, block.y + block.height - 22);
    }

    private paintReadingLines(
        context: CanvasRenderingContext2D,
        lines: string[],
        x: number,
        y: number,
        lineHeight: number,
        maxWidth: number,
        justify = false,
    ): void {
        context.fillStyle = '#f3ead7';
        context.font = '400 33px Georgia, serif';
        lines.forEach((line, index) => {
            const isLastLine = index === lines.length - 1;
            if (justify && !isLastLine) {
                this.fillJustifiedText(context, line, x, y + index * lineHeight, maxWidth);
                return;
            }
            context.fillText(line, x, y + index * lineHeight);
        });
    }

    private paintSpreadSection(
        context: CanvasRenderingContext2D,
        top: number,
        lines: string[],
        lineHeight: number,
    ): void {
        context.fillStyle = '#d8bc74';
        context.font = '600 31px Georgia, serif';
        context.fillText('Spread', SAFE_LEFT, top);

        context.fillStyle = '#efe6d2';
        context.font = '600 23px Georgia, serif';
        lines.forEach((line, index) => {
            context.fillText(line, SAFE_LEFT, top + 40 + (index * lineHeight));
        });
    }

    private paintWatermark(context: CanvasRenderingContext2D, url: string): void {
        context.save();
        context.font = '500 17px Georgia, serif';
        const textWidth = context.measureText(url).width;
        const stampWidth = textWidth + 32;
        const stampHeight = 32;
        const x = SAFE_RIGHT - stampWidth;
        const y = SAFE_BOTTOM - stampHeight;

        context.fillStyle = 'rgba(22, 11, 34, 0.94)';
        context.strokeStyle = 'rgba(225, 194, 113, 0.45)';
        context.lineWidth = 1;
        this.roundRect(context, x, y, stampWidth, stampHeight, 12);
        context.fill();
        context.stroke();

        context.fillStyle = 'rgba(239, 230, 210, 0.82)';
        context.fillText(url, x + 16, y + 21);
        context.strokeStyle = 'rgba(239, 230, 210, 0.52)';
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(x + 16, y + 25);
        context.lineTo(x + 16 + textWidth, y + 25);
        context.stroke();
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
        return Math.round(base + 34 + Math.min(cardCount, 5) * 22);
    }

    private fillJustifiedText(
        context: CanvasRenderingContext2D,
        line: string,
        x: number,
        y: number,
        maxWidth: number,
    ): void {
        const words = line.trim().split(/\s+/).filter(Boolean);
        if (words.length <= 1) {
            context.fillText(line, x, y);
            return;
        }

        const lineWidth = context.measureText(line).width;
        const gapCount = words.length - 1;
        const baseSpace = context.measureText(' ').width;
        const extraSpace = Math.max(0, maxWidth - lineWidth);
        const justifiedSpace = baseSpace + (extraSpace / gapCount);

        let cursorX = x;
        words.forEach((word, index) => {
            context.fillText(word, cursorX, y);
            cursorX += context.measureText(word).width;
            if (index < gapCount) {
                cursorX += justifiedSpace;
            }
        });
    }

    private resolveCardStage(
        block: { x: number; y: number; width: number; height: number },
        rawCardCount: number,
    ): ReadingImageLayoutPlan['cardStage'] {
        const cardCount = Math.max(1, Math.min(MAX_VISIBLE_CARDS, rawCardCount));
        const stageWidth = block.width - CARD_STAGE_PADDING * 2;
        const stageHeight = block.height - CARD_STAGE_PADDING - CARD_STAGE_LABEL_HEIGHT;
        const cardWidth = Math.min(
            168,
            stageWidth / (cardCount <= 2 ? 2.35 : 3.4),
            stageHeight * CARD_ASPECT_RATIO * 0.92,
        );
        const cardHeight = cardWidth / CARD_ASPECT_RATIO;
        const maxSpacing = cardCount === 1 ? 0 : (stageWidth - cardWidth) / (cardCount - 1);
        const preferredSpacing = cardWidth * 0.56;
        const spacing = cardCount === 1 ? 0 : Math.min(preferredSpacing, maxSpacing);
        const clusterWidth = cardCount === 1 ? cardWidth : cardWidth + (cardCount - 1) * spacing;
        const clusterStartX = block.x + (block.width - clusterWidth) / 2;
        const clusterY = block.y + CARD_STAGE_PADDING + Math.max(0, (stageHeight - cardHeight - 28) / 2);

        return {
            width: stageWidth,
            height: stageHeight,
            cardWidth,
            cardHeight,
            spacing,
            clusterWidth,
            clusterStartX,
            clusterY,
            leftPadding: clusterStartX - block.x,
            rightPadding: (block.x + block.width) - (clusterStartX + clusterWidth),
        };
    }

    private buildSpreadSummary(cards: ReadingExportCard[]): string {
        if (cards.length > 3) {
            return cards
                .map(card => `${card.position}: ${this.compactCardName(card.name)}${card.reversed ? ' (Rev)' : ''}`)
                .join(' · ');
        }

        return cards
            .map(card => `${card.position}: ${card.name}${card.reversed ? ' (Reversed)' : ''}`)
            .join(' · ');
    }

    private paintCardMask(
        context: CanvasRenderingContext2D,
        cardWidth: number,
        cardHeight: number,
    ): void {
        const bleed = 6;
        const radius = 10;
        context.fillStyle = '#241138';
        context.strokeStyle = 'rgba(225, 194, 113, 0.18)';
        context.lineWidth = 1;
        this.roundRect(
            context,
            -cardWidth / 2 - bleed,
            -cardHeight / 2 - bleed,
            cardWidth + bleed * 2,
            cardHeight + bleed * 2,
            radius,
        );
        context.fill();
        context.stroke();
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

    private compactCardName(name: string): string {
        const maxLength = 24;
        if (name.length <= maxLength) {
            return name;
        }
        return `${name.slice(0, maxLength - 3).trimEnd()}...`;
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
