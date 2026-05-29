import type { IGameContext, QADigest } from '@shared/models/game-context.js';
import type { CardDraw, ReadingResult, ReadingResponse } from '@shared/contracts/api-contracts.js';

/**
 * Per-spread session state.
 * One game = one card reading + 0..N follow-up turns.
 *
 * Full oracle text renders in UI and logs to R2.
 * Only short digests stay in qaHistory for prompt context.
 */
/** Position labels for clarification cards, in draw order. */
const CLARIFICATION_POSITIONS = ['Clarification 1', 'Clarification 2'];
const MAX_CLARIFICATION_CARDS = CLARIFICATION_POSITIONS.length;

export class GameContext implements IGameContext {
    gameId: string;
    spreadType: 1 | 3 | 5;
    cards: CardDraw[] = [];
    clarificationCards: CardDraw[] = [];
    followUpClarificationCards: CardDraw[] = [];
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

    /**
     * Whether another clarification card can be drawn on the reading screen.
     * Spread-type gating is left to the view: the reading screen offers clarification
     * for single-card spreads only.
     */
    get canAddClarification(): boolean {
        return this.clarificationCards.length < MAX_CLARIFICATION_CARDS;
    }

    /**
     * Follow-ups carry their own clarification budget, independent of the reading
     * screen, so drawing on the reading screen never blocks the follow-up.
     */
    get canAddFollowUpClarification(): boolean {
        return this.followUpClarificationCards.length < MAX_CLARIFICATION_CARDS;
    }

    /** Every clarification card, renumbered globally for prompts/API (Clarification 1..N). */
    allClarificationCards(): CardDraw[] {
        return [...this.clarificationCards, ...this.followUpClarificationCards].map((card, i) => ({
            ...card,
            position: `Clarification ${i + 1}`,
        }));
    }

    /** Names already in play (spread + all clarification), for duplicate-free draws. */
    usedCardNames(): string[] {
        return [...this.cards, ...this.clarificationCards, ...this.followUpClarificationCards]
            .map(c => c.name);
    }

    /**
     * Draw and append one clarification card.
     * Returns the new card, or null if no slot is available / deck exhausted.
     */
    addClarificationCard(name: string, reversed: boolean): CardDraw | null {
        if (!this.canAddClarification) return null;
        const position = CLARIFICATION_POSITIONS[this.clarificationCards.length];
        const card: CardDraw = { position, name, reversed };
        this.clarificationCards.push(card);
        return card;
    }

    /**
     * Draw and append one follow-up clarification card (separate budget).
     * Returns the new card, or null if no slot is available.
     */
    addFollowUpClarificationCard(name: string, reversed: boolean): CardDraw | null {
        if (!this.canAddFollowUpClarification) return null;
        const position = CLARIFICATION_POSITIONS[this.followUpClarificationCards.length];
        const card: CardDraw = { position, name, reversed };
        this.followUpClarificationCards.push(card);
        return card;
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

        const allClarification = this.allClarificationCards();
        if (allClarification.length > 0) {
            ctx += 'CLARIFICATION CARDS: ' + allClarification.map(c =>
                `${c.position}: ${c.name}${c.reversed ? ' (Rev)' : ''}`
            ).join(', ') + '\n';
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
    toApiPayload(options?: { noReversedCards?: boolean }) {
        const cards = this.getCardsForOutput(this.cards, options);
        return {
            gameId: this.gameId,
            spreadType: this.spreadType,
            cards,
            clarificationCards: this.getCardsForOutput(this.allClarificationCards(), options),
            question: this.question,
            topic: this.topic,
            readingDigest: this.readingDigest,
            qaDigests: this.qaHistory.map(q => ({ role: q.role, digest: q.digest })),
            turnCount: this.turnCount,
        };
    }

    normalizeCards(noReversedCards: boolean): void {
        if (!noReversedCards) {
            return;
        }

        this.cards = this.cards.map(card => ({
            ...card,
            reversed: false,
        }));
        this.clarificationCards = this.clarificationCards.map(card => ({
            ...card,
            reversed: false,
        }));
        this.followUpClarificationCards = this.followUpClarificationCards.map(card => ({
            ...card,
            reversed: false,
        }));
    }

    /** Reset for new game. */
    reset(spreadType: 1 | 3 | 5): void {
        this.gameId = crypto.randomUUID();
        this.spreadType = spreadType;
        this.cards = [];
        this.clarificationCards = [];
        this.followUpClarificationCards = [];
        this.question = null;
        this.topic = null;
        this.reading = null;
        this.readingDigest = null;
        this.qaHistory = [];
        this.readingLang = null;
        this.readingTone = null;
        this.turnCount = 0;
    }

    private getCardsForOutput(cards: CardDraw[], options?: { noReversedCards?: boolean }): CardDraw[] {
        if (!options?.noReversedCards) {
            return cards;
        }

        return cards.map(card => ({
            ...card,
            reversed: false,
        }));
    }
}
