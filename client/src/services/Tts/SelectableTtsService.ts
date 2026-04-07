import type { ITtsService, SpeakOptions } from './ITtsService.js';
import type { IProgressReporter } from '../IProgressReporter.js';

type TtsProvider = 'browser' | 'piper';

export class SelectableTtsService implements ITtsService {
    private activeSpeaker: ITtsService | null = null;

    constructor(
        private readonly providers: Record<TtsProvider, ITtsService>,
        private readonly defaultProvider: TtsProvider = 'browser',
    ) {}

    isAvailable(): boolean {
        return Object.values(this.providers).some(provider => provider.isAvailable());
    }

    async speakAsync(
        text: string,
        lang: string,
        options?: SpeakOptions,
        progress?: IProgressReporter,
    ): Promise<void> {
        const providerKey = options?.provider ?? this.defaultProvider;
        const provider = this.providers[providerKey];
        this.activeSpeaker = provider;
        await provider.speakAsync(text, lang, options, progress);
    }

    stop(): void {
        for (const provider of Object.values(this.providers)) {
            provider.stop();
        }
        this.activeSpeaker = null;
    }

    pause(): void {
        this.activeSpeaker?.pause();
    }

    resume(): void {
        this.activeSpeaker?.resume();
    }
}
