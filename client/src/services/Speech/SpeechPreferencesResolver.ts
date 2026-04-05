import type { AppConfig, LanguageConfig } from '../../app/config.js';
import type { UserContext } from '../../models/UserContext.js';
import type { SpeakOptions } from '../Tts/ITtsService.js';

export class SpeechPreferencesResolver {
    constructor(private readonly config: AppConfig) {}

    resolveBrowserLocale(userContext: UserContext): string {
        return this.findLanguageConfig(userContext.language)?.sttLang ?? 'en-US';
    }

    resolveSpeechOptions(userContext: UserContext): SpeakOptions {
        const speed = this.resolveSpeed();
        if (userContext.voicePreference === 'off') {
            return { speed };
        }

        const languageConfig = this.findLanguageConfig(userContext.language);
        return {
            speed,
            voiceId: languageConfig?.voiceId ?? undefined,
        };
    }

    resolveVoiceEnabled(userContext: UserContext): boolean {
        return userContext.voicePreference !== 'off';
    }

    private findLanguageConfig(languageCode: string): LanguageConfig | undefined {
        return this.config.languages.find(language => language.code === languageCode);
    }

    private resolveSpeed(): number {
        const raw = localStorage.getItem('tarot-tts-speed');
        const parsed = raw ? parseFloat(raw) : NaN;
        return Number.isFinite(parsed) ? parsed : this.config.tts.defaultSpeed;
    }
}
