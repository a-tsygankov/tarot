import type { ITtsService, SpeakOptions } from './ITtsService.js';
import type { IProgressReporter } from '../IProgressReporter.js';
import type { IApiService } from '../IApiService.js';
import type { AppConfig } from '../../app/config.js';

/**
 * ElevenLabs TTS via Worker proxy.
 * Sends text to Worker -> Worker calls ElevenLabs -> returns mp3 blob.
 */
export class ElevenLabsTtsService implements ITtsService {
    private audio: HTMLAudioElement | null = null;
    private readonly apiService: IApiService;
    private readonly config: AppConfig;

    constructor(apiService: IApiService, config: AppConfig) {
        this.apiService = apiService;
        this.config = config;
    }

    isAvailable(): boolean {
        return true; // Always available via proxy
    }

    async speakAsync(
        text: string,
        lang: string,
        options: SpeakOptions = {},
        progress?: IProgressReporter,
    ): Promise<void> {
        progress?.report('Generating voice...', 10);

        const blob = await this.apiService.fetchTtsAsync(
            text,
            lang,
            options.voiceId ?? null,
            { progress },
        );

        progress?.report('Playing audio...', 70);

        this.audio = new Audio(URL.createObjectURL(blob));
        this.audio.playbackRate = options.speed ?? this.config.tts.defaultSpeed;

        return new Promise((resolve, reject) => {
            if (!this.audio) return reject(new Error('Audio not initialized'));

            this.audio.onended = () => {
                progress?.report('Done', 100);
                options.onEnd?.();
                resolve();
            };
            this.audio.onerror = () => reject(new Error('Audio playback error'));

            options.onStart?.();
            this.audio.play().catch(reject);
        });
    }

    stop(): void {
        if (this.audio) {
            this.audio.pause();
            this.audio.currentTime = 0;
        }
    }

    pause(): void {
        this.audio?.pause();
    }

    resume(): void {
        this.audio?.play();
    }
}
