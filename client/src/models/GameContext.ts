import type { IGameContext, QADigest } from '@shared/models/game-context.js';
import type { CardDraw, ReadingResult, ReadingResponse } from '@shared/contracts/api-contracts.js';

/**
 * Per-spread session state.
 * One game = one card reading + 0..N follow-up turns.
 *
 * Full oracle text renders in UI and logs to R2.
 * Only short digests stay in qaHistory for prompt context.
 */
export class GameContext implements IGameContext {
    gameId: string;
    spreadType: 1 | 3 | 5;
    cards: CardDraw[] = [];
    question: string | null = null;
    topic: string | null = null;
    reading: ReadingResult | null = null;
    readingDigest: string | null = null;
    qaHistory: QADigest[] = [];
    readingLang: string | null = null;
    readingTone: string | null = null;
    turnCount = 0;

    constructor(spreadType: 1 | 3 | 5) {
        this.gameId = crypto.randomUUID();
        this.spreadType = spreadType;
    }

    /** Add a drawn card. */
    addCard(card: CardDraw): void {
        this.cards.push(card);
    }

    /** Check if all cards are revealed. */
    isComplete(): boolean {
        return this.cards.length >= this.spreadType;
    }

    /** Apply AI reading response: store full reading + digest. */
    applyReading(response: ReadingResponse): void {
        this.reading = response.reading;
        this.readingDigest = response.contextUpdate;
    }

    /**
     * Add a Q&A exchange — DIGESTS ONLY, not full text.
     * Full answer text is rendered in UI and logged to R2 separately.
     */
    addQA(questionDigest: string, answerDigest: string): void {
        this.qaHistory.push(
            { role: 'user', digest: questionDigest, ts: Date.now() },
            { role: 'oracle', digest: answerDigest, ts: Date.now() },
        );
        this.turnCount++;
    }

    /** Is this a "long conversation" (triggers adaptive token budget)? */
    isLongConversation(): boolean {
        return this.turnCount >= 3;
    }

    /** Build context string for AI prompt (distilled). */
    toPromptContext(): string {
        let ctx = `GAME: ${this.spreadType}-card spread.\n`;

        ctx += 'CARDS: ' + this.cards.map(c =>
            `${c.position}: ${c.name}${c.reversed ? ' (Rev)' : ''}`
        ).join(', ') + '\n';

        if (this.readingDigest) {
            ctx += 'READING SUMMARY: ' + this.readingDigest + '\n';
        }

        if (this.qaHistory.length > 0) {
            ctx += 'CONVERSATION HISTORY (digests):\n';
            for (const qa of this.qaHistory) {
                ctx += `  ${qa.role.toUpperCase()}: ${qa.digest}\n`;
            }
        }

        return ctx;
    }

    /** Serialize for API requests. */
    toApiPayload() {
        return {
            gameId: this.gameId,
            spreadType: this.spreadType,
            cards: this.cards,
            question: this.question,
            topic: this.topic,
            readingDigest: this.readingDigest,
            qaDigests: this.qaHistory.map(q => ({ role: q.role, digest: q.digest })),
            turnCount: this.turnCount,
        };
    }

    /** Reset for new game. */
    reset(spreadType: 1 | 3 | 5): void {
        this.gameId = crypto.randomUUID();
        this.spreadType = spreadType;
        this.cards = [];
        this.question = null;
        this.topic = null;
        this.reading = null;
        this.readingDigest = null;
        this.qaHistory = [];
        this.readingLang = null;
        this.readingTone = null;
        this.turnCount = 0;
    }
}
