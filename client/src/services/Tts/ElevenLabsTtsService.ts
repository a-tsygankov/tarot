import type { ITtsService, SpeakOptions } from './ITtsService.js';
import type { IProgressReporter } from '../IProgressReporter.js';
import type { IApiService } from '../IApiService.js';
import type { AppConfig } from '../../app/config.js';
import { recordTtsDiagnostics } from './tts-diagnostics.js';

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
        recordTtsDiagnostics({
            provider: 'elevenlabs',
            phase: 'start',
            timestamp: new Date().toISOString(),
            details: {
                language: lang,
                textLength: text.length,
                voiceId: options.voiceId ?? null,
                speed: options.speed ?? this.config.tts.defaultSpeed,
            },
        });
        progress?.report('Generating voice...', 10);

        let blob: Blob;
        try {
            blob = await this.apiService.fetchTtsAsync(
                text,
                lang,
                options.voiceId ?? null,
                { progress },
            );
        } catch (error) {
            recordTtsDiagnostics({
                provider: 'elevenlabs',
                phase: 'error',
                timestamp: new Date().toISOString(),
                details: this.errorDetails(error, lang, options.voiceId ?? null),
            });
            throw error;
        }

        progress?.report('Playing audio...', 70);
        recordTtsDiagnostics({
            provider: 'elevenlabs',
            phase: 'playback',
            timestamp: new Date().toISOString(),
            details: {
                blobSize: blob.size,
                language: lang,
                voiceId: options.voiceId ?? null,
            },
        });

        this.audio = new Audio(URL.createObjectURL(blob));
        this.audio.playbackRate = options.speed ?? this.config.tts.defaultSpeed;

        return new Promise((resolve, reject) => {
            if (!this.audio) return reject(new Error('Audio not initialized'));

            this.audio.onended = () => {
                recordTtsDiagnostics({
                    provider: 'elevenlabs',
                    phase: 'success',
                    timestamp: new Date().toISOString(),
                    details: {
                        language: lang,
                        voiceId: options.voiceId ?? null,
                    },
                });
                progress?.report('Done', 100);
                options.onEnd?.();
                resolve();
            };
            this.audio.onerror = () => {
                const error = new Error('Audio playback error');
                recordTtsDiagnostics({
                    provider: 'elevenlabs',
                    phase: 'error',
                    timestamp: new Date().toISOString(),
                    details: this.errorDetails(error, lang, options.voiceId ?? null),
                });
                reject(error);
            };

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

    private errorDetails(error: unknown, lang: string, voiceId: string | null): Record<string, unknown> {
        if (error && typeof error === 'object') {
            const anyError = error as Record<string, unknown>;
            return {
                language: lang,
                voiceId,
                name: anyError.name ?? 'Error',
                message: anyError.message ?? String(error),
                code: anyError.code ?? null,
                status: anyError.status ?? null,
                details: anyError.details ?? null,
            };
        }

        return {
            language: lang,
            voiceId,
            message: String(error),
        };
    }
}
