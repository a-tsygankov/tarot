import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.stubGlobal('crypto', { randomUUID: () => 'game-uuid-5678' });

import { GameContext } from '../src/models/GameContext.js';
import type { ReadingResponse } from '@shared/contracts/api-contracts.js';

describe('GameContext', () => {
    let game: GameContext;

    beforeEach(() => {
        game = new GameContext(3);
    });

    it('initializes with correct defaults', () => {
        expect(game.gameId).toBe('game-uuid-5678');
        expect(game.spreadType).toBe(3);
        expect(game.cards).toEqual([]);
        expect(game.question).toBeNull();
        expect(game.topic).toBeNull();
        expect(game.reading).toBeNull();
        expect(game.readingDigest).toBeNull();
        expect(game.qaHistory).toEqual([]);
        expect(game.turnCount).toBe(0);
    });

    describe('addCard', () => {
        it('adds card to collection', () => {
            game.addCard({ name: 'The Fool', position: 'Past', reversed: false });
            expect(game.cards).toHaveLength(1);
            expect(game.cards[0].name).toBe('The Fool');
        });
    });

    describe('isComplete', () => {
        it('returns false when cards < spreadType', () => {
            game.addCard({ name: 'The Fool', position: 'Past', reversed: false });
            expect(game.isComplete()).toBe(false);
        });

        it('returns true when cards >= spreadType', () => {
            game.addCard({ name: 'The Fool', position: 'Past', reversed: false });
            game.addCard({ name: 'Death', position: 'Present', reversed: true });
            game.addCard({ name: 'Ace of Cups', position: 'Future', reversed: false });
            expect(game.isComplete()).toBe(true);
        });
    });

    describe('applyReading', () => {
        it('stores reading and digest', () => {
            const response: ReadingResponse = {
                reading: {
                    cards: [{ position: 'Past', name: 'The Fool', reading: '...' }],
                    overall: 'Overall reading text',
                },
                contextUpdate: 'Distilled summary',
                userContextDelta: { name: null, gender: null, birthdate: null, location: null, traits: {} },
                provider: 'gemini',
                model: 'gemini-2.5-flash',
            };

            game.applyReading(response);
            expect(game.reading).toBe(response.reading);
            expect(game.readingDigest).toBe('Distilled summary');
        });
    });

    describe('addQA', () => {
        it('adds digest-only entries and increments turnCount', () => {
            game.addQA('Asked about Death card', 'Explained resistance to change');
            expect(game.qaHistory).toHaveLength(2);
            expect(game.qaHistory[0].role).toBe('user');
            expect(game.qaHistory[0].digest).toBe('Asked about Death card');
            expect(game.qaHistory[1].role).toBe('oracle');
            expect(game.qaHistory[1].digest).toBe('Explained resistance to change');
            expect(game.turnCount).toBe(1);
        });

        it('accumulates across multiple turns', () => {
            game.addQA('Q1', 'A1');
            game.addQA('Q2', 'A2');
            expect(game.qaHistory).toHaveLength(4);
            expect(game.turnCount).toBe(2);
        });
    });

    describe('isLongConversation', () => {
        it('returns false for < 3 turns', () => {
            game.addQA('Q1', 'A1');
            game.addQA('Q2', 'A2');
            expect(game.isLongConversation()).toBe(false);
        });

        it('returns true for >= 3 turns', () => {
            game.addQA('Q1', 'A1');
            game.addQA('Q2', 'A2');
            game.addQA('Q3', 'A3');
            expect(game.isLongConversation()).toBe(true);
        });
    });

    describe('toPromptContext', () => {
        it('builds context with cards and digest', () => {
            game.addCard({ name: 'The Fool', position: 'Past', reversed: false });
            game.addCard({ name: 'Death', position: 'Present', reversed: true });
            game.readingDigest = 'Love reading summary';

            const ctx = game.toPromptContext();
            expect(ctx).toContain('3-card spread');
            expect(ctx).toContain('Past: The Fool');
            expect(ctx).toContain('Present: Death (Rev)');
            expect(ctx).toContain('READING SUMMARY: Love reading summary');
        });

        it('includes QA history digests', () => {
            game.addQA('Asked about Death', 'Explained transformation');
            const ctx = game.toPromptContext();
            expect(ctx).toContain('USER: Asked about Death');
            expect(ctx).toContain('ORACLE: Explained transformation');
        });
    });

    describe('toApiPayload', () => {
        it('returns correct shape', () => {
            game.question = 'Will my relationship work out?';
            game.topic = 'Love';
            game.addCard({ name: 'The Fool', position: 'Past', reversed: false });
            game.addQA('Q1', 'A1');

            const payload = game.toApiPayload();
            expect(payload.gameId).toBe('game-uuid-5678');
            expect(payload.spreadType).toBe(3);
            expect(payload.cards).toHaveLength(1);
            expect(payload.question).toBe('Will my relationship work out?');
            expect(payload.qaDigests).toHaveLength(2);
            expect(payload.turnCount).toBe(1);
        });
    });

    describe('reset', () => {
        it('clears all state for new game', () => {
            game.question = 'Test';
            game.addCard({ name: 'The Fool', position: 'Past', reversed: false });
            game.addQA('Q1', 'A1');
            game.readingDigest = 'Summary';

            game.reset(1);
            expect(game.spreadType).toBe(1);
            expect(game.cards).toEqual([]);
            expect(game.question).toBeNull();
            expect(game.qaHistory).toEqual([]);
            expect(game.readingDigest).toBeNull();
            expect(game.turnCount).toBe(0);
        });
    });
});
