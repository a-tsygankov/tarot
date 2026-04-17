import type { ITtsService, SpeakOptions } from './ITtsService.js';
import type { IProgressReporter } from '../IProgressReporter.js';
import type { AppConfig } from '../../app/config.js';
import { PIPER_ONNX_RUNTIME_VERSION } from '@shared/config/piper-runtime.js';
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
    private audioObjectUrl: string | null = null;
    private playbackUnlocked = false;
    private unlockListenersAttached = false;
    private readonly pending = new Map<string, PendingRequest>();

    private readonly unlockPlaybackHandler = () => {
        void this.unlockPlaybackAsync();
    };

    constructor(private readonly config: AppConfig) {
        this.attachUnlockListeners();
    }

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
                onnxRuntimeVersion: PIPER_ONNX_RUNTIME_VERSION,
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
        await this.unlockPlaybackAsync();
        this.resetAudioObjectUrl();

        const audio = this.getAudio();
        audio.src = objectUrl;
        audio.load();
        this.audio = audio;
        this.audioObjectUrl = objectUrl;
        audio.playbackRate = options.speed ?? this.config.tts.defaultSpeed;

        return new Promise((resolve, reject) => {
            audio.onended = () => {
                this.resetAudioObjectUrl();
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
                const error = new Error('Piper audio playback failed');
                recordTtsDiagnostics({
                    provider: 'piper',
                    phase: 'error',
                    timestamp: new Date().toISOString(),
                    details: { voiceId: options.voiceId, message: error.message },
                });
                this.resetAudioObjectUrl();
                reject(error);
            };

            options.onStart?.();
            audio.play().catch((error) => {
                recordTtsDiagnostics({
                    provider: 'piper',
                    phase: 'error',
                    timestamp: new Date().toISOString(),
                    details: { voiceId: options.voiceId, message: error instanceof Error ? error.message : String(error) },
                });
                this.resetAudioObjectUrl();
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
        }
        this.resetAudioObjectUrl();
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

    private getAudio(): HTMLAudioElement {
        if (!this.audio) {
            const audio = new Audio();
            audio.preload = 'auto';
            audio.setAttribute('playsinline', 'true');
            this.audio = audio;
        }
        return this.audio;
    }

    private async unlockPlaybackAsync(): Promise<void> {
        if (this.playbackUnlocked || typeof window === 'undefined') {
            return;
        }

        const audio = this.getAudio();
        const previousMuted = audio.muted;
        const previousVolume = audio.volume;
        const previousSrc = audio.src;

        audio.muted = true;
        audio.volume = 0;
        audio.src = 'data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAFAAAGhgAAGhoaJCQkJDExMTFBQUFBTU1NTVpaWlpqamprd3d3d4SEhISQkJCQnZ2dnamppbW1tbnBwcHOzs7O0dHR0d3d3eLi4uLv7+/v////AAAAAExhdmM1OC4zNQAAAAAAAAAAAAAAACQCkAAAAAAAAAaG4G5bJQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uQxAADBc0xK9QAAANIAAAAAExBTUUzLjk4LjIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

        try {
            await audio.play();
            audio.pause();
            audio.currentTime = 0;
            this.playbackUnlocked = true;
            this.detachUnlockListeners();
        } catch {
            // Keep listeners attached and retry on the next real user gesture.
        } finally {
            audio.muted = previousMuted;
            audio.volume = previousVolume;
            audio.src = previousSrc;
        }
    }

    private attachUnlockListeners(): void {
        if (this.unlockListenersAttached || typeof window === 'undefined') {
            return;
        }

        const options: AddEventListenerOptions = { passive: true };
        window.addEventListener('pointerdown', this.unlockPlaybackHandler, options);
        window.addEventListener('touchend', this.unlockPlaybackHandler, options);
        window.addEventListener('click', this.unlockPlaybackHandler, options);
        window.addEventListener('keydown', this.unlockPlaybackHandler);
        this.unlockListenersAttached = true;
    }

    private detachUnlockListeners(): void {
        if (!this.unlockListenersAttached || typeof window === 'undefined') {
            return;
        }

        window.removeEventListener('pointerdown', this.unlockPlaybackHandler);
        window.removeEventListener('touchend', this.unlockPlaybackHandler);
        window.removeEventListener('click', this.unlockPlaybackHandler);
        window.removeEventListener('keydown', this.unlockPlaybackHandler);
        this.unlockListenersAttached = false;
    }

    private resetAudioObjectUrl(): void {
        if (this.audioObjectUrl) {
            URL.revokeObjectURL(this.audioObjectUrl);
            this.audioObjectUrl = null;
        }
        if (this.audio) {
            this.audio.removeAttribute('src');
            this.audio.load();
        }
    }

    private sendWorkerRequest(message: PiperWorkerRequest, progress?: IProgressReporter): Promise<ArrayBuffer | void> {
        const worker = this.getWorker();
        return new Promise((resolve, reject) => {
            this.pending.set(message.id, { resolve, reject, progress });
            worker.postMessage(message);
        });
    }
}
