import { CONFIG } from './config.js';
import { UserContext } from '../models/UserContext.js';
import { GameContext } from '../models/GameContext.js';
import { ApiService } from '../services/ApiService.js';
import { BrowserSttService } from '../services/Stt/BrowserSttService.js';
import { ElevenLabsTtsService } from '../services/Tts/ElevenLabsTtsService.js';
import { BrowserTtsService } from '../services/Tts/BrowserTtsService.js';
import { FallbackTtsService } from '../services/Tts/FallbackTtsService.js';
import { SpeechPreferencesResolver } from '../services/Speech/SpeechPreferencesResolver.js';
import { SpeechService } from '../services/Speech/SpeechService.js';
import { CompatibilityService } from '../services/Versioning/CompatibilityService.js';
import { GeoService } from '../services/GeoService.js';
import type { ITtsService } from '../services/Tts/ITtsService.js';
import type { ISpeechService } from '../services/Speech/ISpeechService.js';
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
    speechService: ISpeechService;
    sttService: ISttService;
    compatibilityService: CompatibilityService;
    geoService: GeoService;
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
    const speechPreferences = new SpeechPreferencesResolver(CONFIG);
    const speechService = new SpeechService(ttsService, speechPreferences);

    // STT — browser only
    const sttService: ISttService = new BrowserSttService();

    // Versioning
    const compatibilityService = new CompatibilityService(apiService, CONFIG.version);

    // Geo (passive, no permission needed)
    const geoService = new GeoService(CONFIG.apiBase);
    // Kick off async IP geo fetch (non-blocking)
    geoService.fetchIpGeo().catch(() => {});

    return {
        config: CONFIG,
        userContext,
        gameContext,
        apiService,
        ttsService,
        speechService,
        sttService,
        compatibilityService,
        geoService,
    };
}
