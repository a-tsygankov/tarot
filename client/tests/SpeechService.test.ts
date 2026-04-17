import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CONFIG } from '../src/app/config.js';
import { UserContext } from '../src/models/UserContext.js';
import { SpeechPreferencesResolver } from '../src/services/Speech/SpeechPreferencesResolver.js';
import { SpeechService } from '../src/services/Speech/SpeechService.js';
import type { ITtsService, SpeakOptions } from '../src/services/Tts/ITtsService.js';

const storage: Record<string, string> = {};
const localStorageMock = {
    getItem: vi.fn((key: string) => storage[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { storage[key] = value; }),
    removeItem: vi.fn((key: string) => { delete storage[key]; }),
    clear: vi.fn(() => { for (const key of Object.keys(storage)) delete storage[key]; }),
};

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });
vi.stubGlobal('crypto', { randomUUID: () => 'speech-uuid' });
vi.stubGlobal('navigator', { userAgent: 'test-agent', platform: 'test-platform', maxTouchPoints: 0 });
vi.stubGlobal('screen', { width: 390, height: 844 });

describe('SpeechService', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    it('uses current user language and voice preference for reading playback', async () => {
        const speakAsync = vi.fn().mockResolvedValue(undefined);
        const tts: ITtsService = {
            isAvailable: vi.fn(() => true),
            speakAsync,
            stop: vi.fn(),
            pause: vi.fn(),
            resume: vi.fn(),
        };

        const service = new SpeechService(tts, new SpeechPreferencesResolver(CONFIG));
        const userContext = new UserContext();
        userContext.language = 'RUS';
        userContext.voicePreference = 'female';
        userContext.ttsProvider = 'piper';
        localStorage.setItem('tarot-tts-speed', '1.5');

        await service.speakReadingAsync('Prediction', userContext);

        expect(speakAsync).toHaveBeenCalledWith(
            'Prediction',
            'ru-RU',
            expect.objectContaining({ voiceId: 'ru_RU-irina-medium', speed: 1.5 }),
            undefined,
        );
    });

    it('reacts to user context changes between playback calls', async () => {
        const calls: Array<{ lang: string; options?: SpeakOptions }> = [];
        const tts: ITtsService = {
            isAvailable: vi.fn(() => true),
            speakAsync: vi.fn(async (_text: string, lang: string, options?: SpeakOptions) => {
                calls.push({ lang, options });
            }),
            stop: vi.fn(),
            pause: vi.fn(),
            resume: vi.fn(),
        };

        const service = new SpeechService(tts, new SpeechPreferencesResolver(CONFIG));
        const userContext = new UserContext();
        userContext.voicePreference = 'female';
        userContext.ttsProvider = 'piper';

        await service.speakConversationAsync('First', userContext);

        userContext.language = 'RUS';
        await service.speakConversationAsync('Second', userContext);

        expect(calls[0]).toEqual(expect.objectContaining({
            lang: 'en-US',
            options: expect.objectContaining({ voiceId: 'en_US-hfc_female-medium' }),
        }));
        expect(calls[1]).toEqual(expect.objectContaining({
            lang: 'ru-RU',
            options: expect.objectContaining({ voiceId: 'ru_RU-irina-medium' }),
        }));
    });

    it('stops playback when voice is turned off', async () => {
        const tts: ITtsService = {
            isAvailable: vi.fn(() => true),
            speakAsync: vi.fn().mockResolvedValue(undefined),
            stop: vi.fn(),
            pause: vi.fn(),
            resume: vi.fn(),
        };

        const service = new SpeechService(tts, new SpeechPreferencesResolver(CONFIG));
        const userContext = new UserContext();
        userContext.voicePreference = 'off';

        await expect(service.speakReadingAsync('Prediction', userContext))
            .rejects.toThrow('Voice playback is turned off in Settings.');
        expect(tts.speakAsync).not.toHaveBeenCalled();
    });

    it('does not play audio when mute is enabled', async () => {
        const tts: ITtsService = {
            isAvailable: vi.fn(() => true),
            speakAsync: vi.fn().mockResolvedValue(undefined),
            stop: vi.fn(),
            pause: vi.fn(),
            resume: vi.fn(),
        };

        const service = new SpeechService(tts, new SpeechPreferencesResolver(CONFIG));
        const userContext = new UserContext();
        userContext.muted = true;

        await expect(service.speakReadingAsync('Prediction', userContext))
            .rejects.toThrow('Audio is muted in Settings.');
        expect(tts.speakAsync).not.toHaveBeenCalled();
    });

    it('routes browser TTS without Piper voice ids when browser engine is selected', async () => {
        const speakAsync = vi.fn().mockResolvedValue(undefined);
        const tts: ITtsService = {
            isAvailable: vi.fn(() => true),
            speakAsync,
            stop: vi.fn(),
            pause: vi.fn(),
            resume: vi.fn(),
        };

        const service = new SpeechService(tts, new SpeechPreferencesResolver(CONFIG));
        const userContext = new UserContext();
        userContext.language = 'ENG';
        userContext.voicePreference = 'female';
        userContext.ttsProvider = 'browser';

        await service.speakReadingAsync('Prediction', userContext);

        expect(speakAsync).toHaveBeenCalledWith(
            'Prediction',
            'en-US',
            expect.objectContaining({ provider: 'browser', speed: 1 }),
            undefined,
        );
        expect(speakAsync.mock.calls[0]?.[2]?.voiceId).toBeUndefined();
    });
});
