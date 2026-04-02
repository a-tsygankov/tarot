import { describe, it, expect, vi } from 'vitest';
import { FallbackTtsService } from '../src/services/Tts/FallbackTtsService.js';
import type { ITtsService } from '../src/services/Tts/ITtsService.js';

function createMockTts(shouldFail = false): ITtsService {
    return {
        isAvailable: vi.fn(() => true),
        speakAsync: shouldFail
            ? vi.fn().mockRejectedValue(new Error('TTS failed'))
            : vi.fn().mockResolvedValue(undefined),
        stop: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
    };
}

describe('FallbackTtsService', () => {
    it('uses primary when it succeeds', async () => {
        const primary = createMockTts(false);
        const fallback = createMockTts(false);
        const tts = new FallbackTtsService(primary, fallback);

        await tts.speakAsync('hello', 'en-US');
        expect(primary.speakAsync).toHaveBeenCalled();
        expect(fallback.speakAsync).not.toHaveBeenCalled();
    });

    it('falls back when primary fails', async () => {
        const primary = createMockTts(true);
        const fallback = createMockTts(false);
        const tts = new FallbackTtsService(primary, fallback);

        await tts.speakAsync('hello', 'en-US');
        expect(primary.speakAsync).toHaveBeenCalled();
        expect(fallback.speakAsync).toHaveBeenCalled();
    });

    it('delegates stop to active speaker', async () => {
        const primary = createMockTts(false);
        const fallback = createMockTts(false);
        const tts = new FallbackTtsService(primary, fallback);

        await tts.speakAsync('hello', 'en-US');
        tts.stop();
        expect(primary.stop).toHaveBeenCalled();
    });

    it('delegates stop to fallback after primary failure', async () => {
        const primary = createMockTts(true);
        const fallback = createMockTts(false);
        const tts = new FallbackTtsService(primary, fallback);

        await tts.speakAsync('hello', 'en-US');
        tts.stop();
        expect(fallback.stop).toHaveBeenCalled();
    });

    it('reports available if either is available', () => {
        const primary: ITtsService = { ...createMockTts(), isAvailable: vi.fn(() => false) };
        const fallback = createMockTts();
        const tts = new FallbackTtsService(primary, fallback);
        expect(tts.isAvailable()).toBe(true);
    });
});
