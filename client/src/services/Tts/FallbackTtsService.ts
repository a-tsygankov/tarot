import type { ITtsService, SpeakOptions } from './ITtsService.js';
import type { IProgressReporter } from '../IProgressReporter.js';

/**
 * Composite TTS: tries primary (ElevenLabs), falls back to secondary (browser).
 */
export class FallbackTtsService implements ITtsService {
    private activeSpeaker: ITtsService | null = null;

    constructor(
        private readonly primary: ITtsService,
        private readonly fallback: ITtsService,
    ) {}

    isAvailable(): boolean {
        return this.primary.isAvailable() || this.fallback.isAvailable();
    }

    async speakAsync(
        text: string,
        lang: string,
        options?: SpeakOptions,
        progress?: IProgressReporter,
    ): Promise<void> {
        try {
            this.activeSpeaker = this.primary;
            await this.primary.speakAsync(text, lang, options, progress);
        } catch (err) {
            console.warn('Primary TTS failed, falling back:', err);
            this.activeSpeaker = this.fallback;
            await this.fallback.speakAsync(text, lang, options, progress);
        }
    }

    stop(): void {
        this.activeSpeaker?.stop();
    }

    pause(): void {
        this.activeSpeaker?.pause();
    }

    resume(): void {
        this.activeSpeaker?.resume();
    }
}
