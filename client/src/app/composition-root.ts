import { CONFIG } from './config.js';
import { UserContext } from '../models/UserContext.js';
import { GameContext } from '../models/GameContext.js';
import { ApiService } from '../services/ApiService.js';
import { BrowserSttService } from '../services/Stt/BrowserSttService.js';
import { ElevenLabsTtsService } from '../services/Tts/ElevenLabsTtsService.js';
import { BrowserTtsService } from '../services/Tts/BrowserTtsService.js';
import { FallbackTtsService } from '../services/Tts/FallbackTtsService.js';
import { CompatibilityService } from '../services/Versioning/CompatibilityService.js';
import type { ITtsService } from '../services/Tts/ITtsService.js';
import type { ISttService } from '../services/Stt/ISttService.js';
import type { IApiService } from '../services/IApiService.js';

/**
 * Composition root — DI wiring.
 * All service instantiation happens here. Consumers depend on interfaces.
 */
export interface AppServices {
    config: typeof CONFIG;
    userContext: UserContext;
    gameContext: GameContext;
    apiService: IApiService;
    ttsService: ITtsService;
    sttService: ISttService;
    compatibilityService: CompatibilityService;
}

export function createAppServices(): AppServices {
    // Models
    const userContext = new UserContext();
    userContext.restore();

    const gameContext = new GameContext(3);

    // API
    const apiService = new ApiService(CONFIG, userContext);

    // TTS — ElevenLabs with browser fallback
    const elevenTts = new ElevenLabsTtsService(apiService, CONFIG);
    const browserTts = new BrowserTtsService();
    const ttsService: ITtsService = CONFIG.tts.fallbackToBrowser
        ? new FallbackTtsService(elevenTts, browserTts)
        : elevenTts;

    // STT — browser only
    const sttService: ISttService = new BrowserSttService();

    // Versioning
    const compatibilityService = new CompatibilityService(apiService, CONFIG.version);

    return {
        config: CONFIG,
        userContext,
        gameContext,
        apiService,
        ttsService,
        sttService,
        compatibilityService,
    };
}
