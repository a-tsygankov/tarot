import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CONFIG } from '../src/app/config.js';
import { GameContext } from '../src/models/GameContext.js';
import { UserContext } from '../src/models/UserContext.js';
import type { IApiService } from '../src/services/IApiService.js';
import { SpeechPreferencesResolver } from '../src/services/Speech/SpeechPreferencesResolver.js';
import type { ISpeechService } from '../src/services/Speech/ISpeechService.js';
import type { ISttService, SttHandlers } from '../src/services/Stt/ISttService.js';
import { VoiceModeService } from '../src/services/VoiceMode/VoiceModeService.js';

const storage: Record<string, string> = {};
const localStorageMock = {
    getItem: vi.fn((key: string) => storage[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { storage[key] = value; }),
    removeItem: vi.fn((key: string) => { delete storage[key]; }),
    clear: vi.fn(() => { for (const key of Object.keys(storage)) delete storage[key]; }),
};

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });
vi.stubGlobal('crypto', { randomUUID: () => 'voice-uuid' });
vi.stubGlobal('navigator', { userAgent: 'test-agent', platform: 'test-platform' });
vi.stubGlobal('screen', { width: 390, height: 844 });

describe('VoiceModeService', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    it('re-reads the active language between listening cycles', async () => {
        const sttStarts: string[] = [];
        let currentHandlers: SttHandlers | undefined;

        const stt: ISttService = {
            isAvailable: vi.fn(() => true),
            start: vi.fn((lang: string, handlers: SttHandlers) => {
                sttStarts.push(lang);
                currentHandlers = handlers;
            }),
            stop: vi.fn(),
        };

        const speech: ISpeechService = {
            isAvailable: vi.fn(() => true),
            speakReadingAsync: vi.fn(),
            speakConversationAsync: vi.fn().mockImplementation(async (_text, userContext) => {
                userContext.language = 'RUS';
            }),
            stop: vi.fn(),
            pause: vi.fn(),
            resume: vi.fn(),
        };

        const api: IApiService = {
            fetchReadingAsync: vi.fn(),
            askFollowUpAsync: vi.fn().mockResolvedValue({
                answer: 'Oracle response',
                questionDigest: 'question digest',
                answerDigest: 'answer digest',
                userContextDelta: null,
            }),
            fetchTtsAsync: vi.fn(),
            logSessionAsync: vi.fn(),
            logEvent: vi.fn(),
            checkVersionAsync: vi.fn(),
        };

        const userContext = new UserContext();
        const service = new VoiceModeService(
            stt,
            speech,
            api,
            userContext,
            new SpeechPreferencesResolver(CONFIG),
        );

        service.start(new GameContext(1), {
            onStateChange: vi.fn(),
            onUserTranscript: vi.fn(),
            onOracleResponse: vi.fn(),
            onError: vi.fn(),
        });

        expect(sttStarts).toEqual(['en-US']);

        currentHandlers?.onResult?.('What now?');
        await Promise.resolve();
        await Promise.resolve();

        expect(sttStarts).toEqual(['en-US', 'ru-RU']);
        expect(speech.speakConversationAsync).toHaveBeenCalledWith('Oracle response', userContext);
    });
});
