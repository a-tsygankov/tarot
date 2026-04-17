import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReadingImageExporter, type ReadingExportInput } from '../src/services/Export/ReadingImageExporter.js';

const measureText = (text: string) => ({ width: text.length * 16 });

describe('ReadingImageExporter', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({
            font: '',
            measureText,
        } as unknown as CanvasRenderingContext2D));
    });

    it.each([
        { cards: 1, label: 'single' },
        { cards: 3, label: 'three-card' },
        { cards: 5, label: 'cross' },
    ])('plans a bounded symmetric card stage for $label export', ({ cards }) => {
        const exporter = new ReadingImageExporter();
        const input = buildInput(cards);

        const plan = exporter.planLayout(input, 'https://example.com/tarot');

        expect(plan.textColumnWidth).toBeGreaterThan(0);
        expect(plan.cardStage.cardWidth).toBeGreaterThan(0);
        expect(plan.cardStage.clusterWidth).toBeLessThanOrEqual(plan.cardStage.width);
        expect(Math.abs(plan.cardStage.leftPadding - plan.cardStage.rightPadding)).toBeLessThanOrEqual(1);
    });

    it('simplifies spread summary for spreads larger than three cards', () => {
        const exporter = new ReadingImageExporter();
        const plan = exporter.planLayout(buildInput(5), 'https://example.com/tarot');

        expect(plan.spreadLines.length).toBeLessThanOrEqual(3);
        expect(plan.spreadLines.join(' ')).toContain('(Rev)');
        expect(plan.spreadLineHeight).toBe(28);
    });
});

function buildInput(cardCount: number): ReadingExportInput {
    const cards = Array.from({ length: cardCount }, (_, index) => ({
        name: index % 2 === 0 ? 'Knight of Swords' : 'Five of Wands',
        position: ['Insight', 'Past', 'Present', 'Future', 'Guidance'][index] ?? `Card ${index + 1}`,
        reversed: index % 2 === 0,
    }));

    return {
        title: 'Tarot Oracle',
        subtitle: 'Overall Reading',
        overallReading: 'A deliberately long reading text used to verify export layout across multiple spread sizes without overlapping the card block or the spread summary.',
        cards,
    };
}
