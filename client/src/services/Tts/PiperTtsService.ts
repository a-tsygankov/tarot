import type { ITtsService, SpeakOptions } from './ITtsService.js';
import type { IProgressReporter } from '../IProgressReporter.js';
import type { AppConfig } from '../../app/config.js';
import { recordTtsDiagnostics } from './tts-diagnostics.js';

type PiperWorkerRequest =
    | { id: string; type: 'synthesize'; text: string; voiceId: string; assetBase: string }
    | { id: string; type: 'warmup'; voiceId: string; assetBase: string };

type PiperWorkerResponse =
    | { id: string; type: 'progress'; message: string }
    | { id: string; type: 'ready'; voiceId: string }
    | { id: string; type: 'audio'; audioBuffer: ArrayBuffer }
    | { id: string; type: 'error'; message: string };

interface PendingRequest {
    resolve: (value: ArrayBuffer | void) => void;
    reject: (reason?: unknown) => void;
    progress?: IProgressReporter;
}

export class PiperTtsService implements ITtsService {
    private worker: Worker | null = null;
    private audio: HTMLAudioElement | null = null;
    private readonly pending = new Map<string, PendingRequest>();

    constructor(private readonly config: AppConfig) {}

    isAvailable(): boolean {
        return typeof Worker !== 'undefined' && typeof Audio !== 'undefined';
    }

    async speakAsync(
        text: string,
        _lang: string,
        options: SpeakOptions = {},
        progress?: IProgressReporter,
    ): Promise<void> {
        if (!this.isAvailable()) {
            throw new Error('Piper TTS is not available in this browser.');
        }
        if (!options.voiceId) {
            throw new Error('No Piper voice configured for the selected language.');
        }

        recordTtsDiagnostics({
            provider: 'piper',
            phase: 'start',
            timestamp: new Date().toISOString(),
            details: {
                voiceId: options.voiceId,
                textLength: text.length,
                assetBase: this.config.tts.piper.assetBase,
            },
        });

        progress?.report('Loading offline voice...', 10);
        const audioBuffer = await this.sendWorkerRequest({
            id: crypto.randomUUID(),
            type: 'synthesize',
            text,
            voiceId: options.voiceId,
            assetBase: this.config.tts.piper.assetBase,
        }, progress) as ArrayBuffer;

        progress?.report('Playing Piper audio...', 80);
        const blob = new Blob([audioBuffer], { type: 'audio/wav' });
        const objectUrl = URL.createObjectURL(blob);
        const audio = new Audio(objectUrl);
        this.audio = audio;
        audio.playbackRate = options.speed ?? this.config.tts.defaultSpeed;

        return new Promise((resolve, reject) => {
            audio.onended = () => {
                URL.revokeObjectURL(objectUrl);
                this.audio = null;
                options.onEnd?.();
                progress?.report('Done', 100);
                recordTtsDiagnostics({
                    provider: 'piper',
                    phase: 'success',
                    timestamp: new Date().toISOString(),
                    details: { voiceId: options.voiceId },
                });
                resolve();
            };
            audio.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                this.audio = null;
                const error = new Error('Piper audio playback failed');
                recordTtsDiagnostics({
                    provider: 'piper',
                    phase: 'error',
                    timestamp: new Date().toISOString(),
                    details: { voiceId: options.voiceId, message: error.message },
                });
                reject(error);
            };

            options.onStart?.();
            audio.play().catch((error) => {
                URL.revokeObjectURL(objectUrl);
                this.audio = null;
                recordTtsDiagnostics({
                    provider: 'piper',
                    phase: 'error',
                    timestamp: new Date().toISOString(),
                    details: { voiceId: options.voiceId, message: error instanceof Error ? error.message : String(error) },
                });
                reject(error);
            });
        });
    }

    async warmVoiceAsync(voiceId: string): Promise<void> {
        await this.sendWorkerRequest({
            id: crypto.randomUUID(),
            type: 'warmup',
            voiceId,
            assetBase: this.config.tts.piper.assetBase,
        });
    }

    stop(): void {
        if (this.audio) {
            this.audio.pause();
            this.audio.currentTime = 0;
            this.audio = null;
        }
    }

    pause(): void {
        this.audio?.pause();
    }

    resume(): void {
        void this.audio?.play();
    }

    private getWorker(): Worker {
        if (!this.worker) {
            this.worker = new Worker(new URL('../../workers/piper.worker.ts', import.meta.url), { type: 'module' });
            this.worker.addEventListener('message', (event: MessageEvent<PiperWorkerResponse>) => {
                const message = event.data;
                const pending = this.pending.get(message.id);
                if (!pending) {
                    return;
                }

                if (message.type === 'progress') {
                    pending.progress?.report(message.message);
                    return;
                }

                if (message.type === 'audio') {
                    this.pending.delete(message.id);
                    pending.resolve(message.audioBuffer);
                    return;
                }

                if (message.type === 'ready') {
                    this.pending.delete(message.id);
                    pending.resolve();
                    return;
                }

                if (message.type === 'error') {
                    this.pending.delete(message.id);
                    pending.reject(new Error(message.message));
                }
            });
        }

        return this.worker;
    }

    private sendWorkerRequest(message: PiperWorkerRequest, progress?: IProgressReporter): Promise<ArrayBuffer | void> {
        const worker = this.getWorker();
        return new Promise((resolve, reject) => {
            this.pending.set(message.id, { resolve, reject, progress });
            worker.postMessage(message);
        });
    }
}
