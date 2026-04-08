import { CONFIG } from './config.js';
import { UserContext } from '../models/UserContext.js';
import { GameContext } from '../models/GameContext.js';
import { ApiService } from '../services/ApiService.js';
import { BrowserSttService } from '../services/Stt/BrowserSttService.js';
import { BrowserTtsService } from '../services/Tts/BrowserTtsService.js';
import { PiperTtsService } from '../services/Tts/PiperTtsService.js';
import { SelectableTtsService } from '../services/Tts/SelectableTtsService.js';
import { SpeechPreferencesResolver } from '../services/Speech/SpeechPreferencesResolver.js';
import { SpeechService } from '../services/Speech/SpeechService.js';
import { CompatibilityService } from '../services/Versioning/CompatibilityService.js';
import { GeoService } from '../services/GeoService.js';
import { AudioCueService } from '../services/Audio/AudioCueService.js';
import type { ITtsService } from '../services/Tts/ITtsService.js';
import type { ISpeechService } from '../services/Speech/ISpeechService.js';
import type { ISttService } from '../services/Stt/ISttService.js';
import type { IApiService } from '../services/IApiService.js';
import type { IAudioCueService } from '../services/Audio/IAudioCueService.js';

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
    audioCueService: IAudioCueService;
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

    // TTS — explicit provider selection, persisted in UserContext.
    const browserTts = new BrowserTtsService();
    const piperTts = new PiperTtsService(CONFIG);
    const ttsService: ITtsService = new SelectableTtsService({
        browser: browserTts,
        piper: piperTts,
    }, userContext.ttsProvider);
    const speechPreferences = new SpeechPreferencesResolver(CONFIG);
    const speechService = new SpeechService(ttsService, speechPreferences);
    const audioCueService: IAudioCueService = new AudioCueService();

    // STT — browser only
    const sttService: ISttService = new BrowserSttService();

    // Versioning
    const compatibilityService = new CompatibilityService(apiService, CONFIG.version);

    // Geo (passive, no permission needed)
    const geoService = new GeoService(CONFIG.apiBase);
    // Kick off async IP geo fetch (non-blocking)
    geoService.fetchIpGeo()
        .then(geo => {
            if (!geo) return;
            userContext.applyGeoLocation(geo.city, geo.country, geo.ip);
        })
        .catch(() => {});

    return {
        config: CONFIG,
        userContext,
        gameContext,
        apiService,
        ttsService,
        speechService,
        audioCueService,
        sttService,
        compatibilityService,
        geoService,
    };
}
