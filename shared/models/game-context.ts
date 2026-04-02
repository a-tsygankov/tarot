import type { CardDraw, ReadingResult } from '../contracts/api-contracts.js';

/**
 * GameContext interface — per-spread session state.
 * One game = one card reading + 0..N follow-up turns.
 */
export interface IGameContext {
    gameId: string;
    spreadType: 1 | 3 | 5;
    cards: CardDraw[];
    question: string | null;
    topic: string | null;
    reading: ReadingResult | null;
    readingDigest: string | null;
    qaHistory: QADigest[];
    readingLang: string | null;
    readingTone: string | null;
    turnCount: number;
}

export interface QADigest {
    role: 'user' | 'oracle';
    digest: string;
    ts: number;
}
