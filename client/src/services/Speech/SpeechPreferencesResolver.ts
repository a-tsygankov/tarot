import type { AppConfig, LanguageConfig } from '../../app/config.js';
import type { UserContext } from '../../models/UserContext.js';
import type { SpeakOptions } from '../Tts/ITtsService.js';

export type ResolvedTtsProvider = 'browser' | 'piper';

export class SpeechPreferencesResolver {
    constructor(private readonly config: AppConfig) {}

    resolveBrowserLocale(userContext: UserContext): string {
        return this.findLanguageConfig(userContext.language)?.sttLang ?? 'en-US';
    }

    resolveTtsProvider(userContext: UserContext): ResolvedTtsProvider {
        return userContext.ttsProvider;
    }

    resolveSpeechOptions(userContext: UserContext): SpeakOptions {
        const speed = this.resolveSpeed();
        const provider = this.resolveTtsProvider(userContext);
        if (userContext.voicePreference === 'off') {
            return { speed, provider };
        }

        const languageConfig = this.findLanguageConfig(userContext.language);
        return {
            provider,
            speed,
            voiceId: provider === 'piper' ? languageConfig?.piperVoiceId ?? undefined : undefined,
        };
    }

    resolveElevenLabsVoiceId(userContext: UserContext): string | undefined {
        return this.findLanguageConfig(userContext.language)?.elevenLabsVoiceId ?? undefined;
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
