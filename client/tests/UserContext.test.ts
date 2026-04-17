import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const storage: Record<string, string> = {};
const localStorageMock = {
    getItem: vi.fn((key: string) => storage[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { storage[key] = value; }),
    removeItem: vi.fn((key: string) => { delete storage[key]; }),
    clear: vi.fn(() => { for (const k of Object.keys(storage)) delete storage[k]; }),
    get length() { return Object.keys(storage).length; },
    key: vi.fn((i: number) => Object.keys(storage)[i] ?? null),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock crypto.randomUUID
vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid-1234' });

// Mock navigator/screen/Intl
vi.stubGlobal('navigator', { userAgent: 'test-agent', platform: 'test-platform', maxTouchPoints: 0 });
vi.stubGlobal('screen', { width: 390, height: 844 });

import { UserContext } from '../src/models/UserContext.js';

describe('UserContext', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
        Object.defineProperty(globalThis, 'navigator', {
            value: { userAgent: 'test-agent', platform: 'test-platform', maxTouchPoints: 0 },
            configurable: true,
        });
    });

    it('creates with default values', () => {
        const ctx = new UserContext();
        expect(ctx.uid).toBe('test-uuid-1234');
        expect(ctx.sessionId).toBe('test-uuid-1234');
        expect(ctx.name).toBeNull();
        expect(ctx.gender).toBeNull();
        expect(ctx.language).toBe('ENG');
        expect(ctx.tone).toBe('Mystical');
        expect(ctx.theme).toBe('dusk');
        expect(ctx.noReversedCards).toBe(false);
        expect(ctx.muted).toBe(false);
        expect(ctx.voicePreference).toBe('female');
        expect(ctx.ttsProvider).toBe('piper');
        expect(ctx.userTraits).toBeNull();
        expect(ctx.totalReadings).toBe(0);
    });

    it('reuses existing uid from localStorage', () => {
        storage['tarot_uid'] = 'existing-uid';
        const ctx = new UserContext();
        expect(ctx.uid).toBe('existing-uid');
    });

    it('saves and restores state', () => {
        const ctx = new UserContext();
        ctx.name = 'Anna';
        ctx.gender = 'female';
        ctx.language = 'RUS';
        ctx.tone = 'Ironic';
        ctx.noReversedCards = true;
        ctx.muted = true;
        ctx.voicePreference = 'off';
        ctx.ttsProvider = 'browser';
        ctx.userTraits = {
            id: 'traits-test-uuid-1234',
            userId: 'test-uuid-1234',
            traits: { zodiac_sign: ['Scorpio'] },
            createdAt: '2026-04-08T00:00:00.000Z',
            updatedAt: '2026-04-08T00:00:00.000Z',
        };
        ctx.totalReadings = 5;
        ctx.save();

        const ctx2 = new UserContext();
        ctx2.restore();
        expect(ctx2.name).toBe('Anna');
        expect(ctx2.gender).toBe('female');
        expect(ctx2.language).toBe('RUS');
        expect(ctx2.tone).toBe('Ironic');
        expect(ctx2.noReversedCards).toBe(true);
        expect(ctx2.muted).toBe(true);
        expect(ctx2.voicePreference).toBe('off');
        expect(ctx2.ttsProvider).toBe('browser');
        expect(ctx2.userTraits?.traits).toEqual({ zodiac_sign: ['Scorpio'] });
        expect(ctx2.totalReadings).toBe(5);
    });

    it('persists no reversed cards and mute options independently', () => {
        const ctx = new UserContext();
        ctx.noReversedCards = true;
        ctx.muted = true;
        ctx.save();

        const restored = new UserContext();
        restored.restore();

        expect(restored.noReversedCards).toBe(true);
        expect(restored.muted).toBe(true);
    });

    it('defaults to browser TTS on iPhone devices', () => {
        Object.defineProperty(globalThis, 'navigator', {
            value: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', platform: 'iPhone', maxTouchPoints: 5 },
            configurable: true,
        });

        const ctx = new UserContext();
        expect(ctx.ttsProvider).toBe('browser');
    });

    describe('applyAiUpdate', () => {
        it('merges known fields to top-level', () => {
            const ctx = new UserContext();
            ctx.applyAiUpdate({
                name: 'Anna',
                gender: 'female',
                birthdate: null,
                location: null,
                traits: {},
            });
            expect(ctx.name).toBe('Anna');
            expect(ctx.gender).toBe('female');
        });

        it('ignores null values (never deletes existing)', () => {
            const ctx = new UserContext();
            ctx.name = 'Anna';
            ctx.applyAiUpdate({
                name: null,
                gender: null,
                birthdate: null,
                location: null,
                traits: {},
            });
            expect(ctx.name).toBe('Anna');
        });

        it('does nothing for null delta', () => {
            const ctx = new UserContext();
            ctx.name = 'Anna';
            ctx.applyAiUpdate(null);
            expect(ctx.name).toBe('Anna');
        });

        it('auto-saves after update', () => {
            const ctx = new UserContext();
            ctx.applyAiUpdate({
                name: 'Anna',
                gender: null,
                birthdate: null,
                location: null,
                traits: {},
            });
            expect(localStorageMock.setItem).toHaveBeenCalled();
        });
    });

    describe('toApiPayload', () => {
        it('returns correct shape', () => {
            const ctx = new UserContext();
            ctx.name = 'Anna';
            ctx.language = 'RUS';
            ctx.tone = 'Ironic';
            ctx.applyUserTraits({
                id: 'traits-test-uuid-1234',
                userId: 'test-uuid-1234',
                traits: { zodiac_sign: ['Scorpio'] },
                createdAt: '2026-04-08T00:00:00.000Z',
                updatedAt: '2026-04-08T00:00:00.000Z',
            });

            const payload = ctx.toApiPayload();
            expect(payload.uid).toBe(ctx.uid);
            expect(payload.name).toBe('Anna');
            expect(payload.language).toBe('RUS');
            expect(payload.userTraits?.traits).toEqual({ zodiac_sign: ['Scorpio'] });
        });
    });

    describe('toPromptSummary', () => {
        it('returns "No personal details known." when empty', () => {
            const ctx = new UserContext();
            expect(ctx.toPromptSummary()).toBe('No personal details known.');
        });

        it('builds pipe-delimited summary', () => {
            const ctx = new UserContext();
            ctx.name = 'Anna';
            ctx.gender = 'female';
            ctx.applyUserTraits({
                id: 'traits-test-uuid-1234',
                userId: 'test-uuid-1234',
                traits: { zodiac_sign: ['Scorpio'] },
                createdAt: '2026-04-08T00:00:00.000Z',
                updatedAt: '2026-04-08T00:00:00.000Z',
            });
            const summary = ctx.toPromptSummary();
            expect(summary).toContain('Name: Anna');
            expect(summary).toContain('Gender: female');
            expect(summary).toContain('zodiac sign: Scorpio');
            expect(summary).toContain(' | ');
        });
    });

    describe('applyUserTraits', () => {
        it('replaces local traits snapshot with the server version', () => {
            const ctx = new UserContext();
            ctx.applyUserTraits({
                id: 'traits-test-uuid-1234',
                userId: 'test-uuid-1234',
                traits: { likes: ['tarot', 'cats'], dislikes: ['noise'] },
                createdAt: '2026-04-08T00:00:00.000Z',
                updatedAt: '2026-04-08T00:00:00.000Z',
            });

            expect(ctx.userTraits?.traits).toEqual({
                likes: ['tarot', 'cats'],
                dislikes: ['noise'],
            });
        });

        it('upgrades legacy stored single-value traits into arrays', () => {
            storage.tarot_user_traits = JSON.stringify({ zodiac_sign: 'Scorpio' });

            const ctx = new UserContext();
            ctx.restore();

            expect(ctx.userTraits?.traits).toEqual({ zodiac_sign: ['Scorpio'] });
        });
    });
});
