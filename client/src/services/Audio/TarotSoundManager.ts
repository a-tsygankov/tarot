type SoundPlayback = {
    stop: (options?: { durationMs?: number }) => Promise<void>;
    finished: Promise<void>;
};

type PlaybackSource = AudioBufferSourceNode | OscillatorNode;

interface PlaybackRecord extends SoundPlayback {
    kind: string;
    output: GainNode;
    sources: PlaybackSource[];
    cleanup: () => void;
    isStopped: boolean;
    startedAt: number;
}

export class TarotSoundManager {
    private readonly defaultFadeOutMs: number;
    private readonly logger?: (message: string, error?: unknown) => void;
    private context: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private masterVolume: number;
    private readonly activePlaybacks = new Set<PlaybackRecord>();

    constructor(options: {
        defaultFadeOutMs?: number;
        logger?: (message: string, error?: unknown) => void;
        masterVolume?: number;
    } = {}) {
        this.defaultFadeOutMs = options.defaultFadeOutMs ?? 1000;
        this.logger = options.logger;
        this.masterVolume = this.clampVolume(options.masterVolume ?? 0.9);
    }

    async initialize(): Promise<void> {
        const context = this.getContext();
        if (context.state === 'suspended') {
            await context.resume();
        }
    }

    async playCardReveal(options: {
        fadeInMs?: number;
        signal?: AbortSignal;
        variant?: 'auto' | 'cloth-rustle' | 'parchment-crackle';
        volume?: number;
    } = {}): Promise<SoundPlayback> {
        const context = this.getContext();
        await this.initialize();

        const variant = options.variant === 'auto' || options.variant == null
            ? (Math.random() < 0.5 ? 'cloth-rustle' : 'parchment-crackle')
            : options.variant;

        if (variant === 'cloth-rustle') {
            return this.playClothRustle(context, options);
        }

        return this.playParchmentCrackle(context, options);
    }

    async playOracleWaiting(options: {
        fadeInMs?: number;
        loop?: boolean;
        signal?: AbortSignal;
        volume?: number;
    } = {}): Promise<SoundPlayback> {
        const context = this.getContext();
        await this.initialize();
        return this.playOracleWaitingLoop(context, options);
    }

    async stopAll(options: { durationMs?: number } = {}): Promise<void> {
        await Promise.all(Array.from(this.activePlaybacks).map((playback) => playback.stop(options)));
    }

    async dispose(): Promise<void> {
        await this.stopAll({ durationMs: 120 });

        if (this.context) {
            try {
                await this.context.close();
            } catch (error) {
                this.log('Failed to close audio context.', error);
            }
        }

        this.context = null;
        this.masterGain = null;
    }

    setMasterVolume(volume: number): void {
        const safe = this.clampVolume(volume);
        this.masterVolume = safe;

        if (this.masterGain && this.context) {
            const now = this.context.currentTime;
            this.masterGain.gain.cancelScheduledValues(now);
            this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
            this.masterGain.gain.linearRampToValueAtTime(safe, now + 0.04);
        }
    }

    private getContext(): AudioContext {
        if (!this.context) {
            const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (!AudioContextCtor) {
                throw new Error('Web Audio API is not available in this browser.');
            }

            const context = new AudioContextCtor();
            const masterGain = context.createGain();
            masterGain.gain.value = this.masterVolume;
            masterGain.connect(context.destination);

            this.context = context;
            this.masterGain = masterGain;
        }

        return this.context;
    }

    private createPlayback(kind: string, volume: number): PlaybackRecord {
        const context = this.getContext();
        const output = context.createGain();
        output.gain.value = this.clampVolume(volume);
        output.connect(this.masterGain!);

        let resolveFinished!: () => void;
        const finished = new Promise<void>((resolve) => {
            resolveFinished = resolve;
        });

        const playback: PlaybackRecord = {
            kind,
            startedAt: performance.now(),
            output,
            sources: [],
            cleanup: () => {
                if (!this.activePlaybacks.delete(playback)) {
                    return;
                }

                try {
                    output.disconnect();
                } catch {
                }

                resolveFinished();
            },
            isStopped: false,
            finished,
            stop: async (options) => {
                await this.stopPlayback(playback, options);
            },
        };

        this.activePlaybacks.add(playback);
        return playback;
    }

    private async stopPlayback(playback: PlaybackRecord, options: { durationMs?: number } = {}): Promise<void> {
        if (playback.isStopped || !this.context) {
            return playback.finished;
        }

        playback.isStopped = true;

        const context = this.context;
        const durationMs = Math.max(0, options.durationMs ?? this.defaultFadeOutMs);
        const now = context.currentTime;
        const fadeEnd = now + durationMs / 1000;

        try {
            playback.output.gain.cancelScheduledValues(now);
            playback.output.gain.setValueAtTime(playback.output.gain.value, now);
            playback.output.gain.linearRampToValueAtTime(0.0001, fadeEnd);
        } catch (error) {
            this.log('Failed to schedule fade out.', error);
        }

        window.setTimeout(() => {
            for (const source of playback.sources) {
                try {
                    source.stop();
                } catch {
                }
            }

            playback.cleanup();
        }, durationMs + 40);

        return playback.finished;
    }

    private attachAbortSignal(playback: PlaybackRecord, signal?: AbortSignal): void {
        if (!signal) {
            return;
        }

        if (signal.aborted) {
            void playback.stop();
            return;
        }

        const onAbort = () => {
            signal.removeEventListener('abort', onAbort);
            void playback.stop();
        };

        signal.addEventListener('abort', onAbort, { once: true });
        playback.finished.finally(() => signal.removeEventListener('abort', onAbort));
    }

    private playClothRustle(
        context: AudioContext,
        options: { fadeInMs?: number; signal?: AbortSignal; volume?: number },
    ): SoundPlayback {
        const durationSeconds = 0.8;
        const playback = this.createPlayback('card-reveal', options.volume ?? 1.0);
        this.attachAbortSignal(playback, options.signal);

        const bufferLength = Math.floor(context.sampleRate * durationSeconds);
        const buffer = context.createBuffer(1, bufferLength, context.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferLength; i += 1) {
            const t = i / context.sampleRate;
            const envelope = Math.sin(Math.PI * t / durationSeconds) * 0.5;
            const previous = i > 0 ? data[i - 1] : 0;
            let sample = previous + (Math.random() * 2 - 1) * 0.08;
            sample *= envelope;
            data[i] = Math.max(-1, Math.min(1, sample));
        }

        const source = context.createBufferSource();
        source.buffer = buffer;

        const filter = context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1200;

        source.connect(filter);
        filter.connect(playback.output);

        this.trackSource(playback, source, durationSeconds * 1000);
        this.applyFadeIn(playback.output, options.fadeInMs);
        source.start();

        return playback;
    }

    private playParchmentCrackle(
        context: AudioContext,
        options: { fadeInMs?: number; signal?: AbortSignal; volume?: number },
    ): SoundPlayback {
        const durationSeconds = 0.6;
        const playback = this.createPlayback('card-reveal', options.volume ?? 0.95);
        this.attachAbortSignal(playback, options.signal);

        const bufferLength = Math.floor(context.sampleRate * durationSeconds);
        const buffer = context.createBuffer(1, bufferLength, context.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferLength; i += 1) {
            const t = i / context.sampleRate;
            const envelope = Math.exp(-t * 5) * 0.7;
            const crackle = Math.random() < 0.06 ? (Math.random() - 0.5) * 1.5 : 0;
            const base = (Math.random() * 2 - 1) * 0.15;
            data[i] = (base + crackle) * envelope;
        }

        const source = context.createBufferSource();
        source.buffer = buffer;

        const highPass = context.createBiquadFilter();
        highPass.type = 'highpass';
        highPass.frequency.value = 800;

        const peak = context.createBiquadFilter();
        peak.type = 'peaking';
        peak.frequency.value = 4000;
        peak.gain.value = 6;

        source.connect(highPass);
        highPass.connect(peak);
        peak.connect(playback.output);

        this.trackSource(playback, source, durationSeconds * 1000);
        this.applyFadeIn(playback.output, options.fadeInMs);
        source.start();

        return playback;
    }

    private playOracleWaitingLoop(
        context: AudioContext,
        options: { fadeInMs?: number; loop?: boolean; signal?: AbortSignal; volume?: number },
    ): SoundPlayback {
        const playback = this.createPlayback('oracle-waiting', options.volume ?? 0.34);
        this.attachAbortSignal(playback, options.signal);
        this.applyFadeIn(playback.output, options.fadeInMs ?? 300);

        const lowOscillator = context.createOscillator();
        lowOscillator.type = 'sine';
        lowOscillator.frequency.value = 174.61;

        const highOscillator = context.createOscillator();
        highOscillator.type = 'triangle';
        highOscillator.frequency.value = 261.63;

        const lowGain = context.createGain();
        lowGain.gain.value = 0.22;

        const highGain = context.createGain();
        highGain.gain.value = 0.08;

        const lowPass = context.createBiquadFilter();
        lowPass.type = 'lowpass';
        lowPass.frequency.value = 850;
        lowPass.Q.value = 0.8;

        const tremolo = context.createOscillator();
        tremolo.type = 'sine';
        tremolo.frequency.value = 0.22;

        const tremoloDepth = context.createGain();
        tremoloDepth.gain.value = 0.035;

        tremolo.connect(tremoloDepth);
        tremoloDepth.connect(lowGain.gain);
        tremoloDepth.connect(highGain.gain);

        lowOscillator.connect(lowGain);
        highOscillator.connect(highGain);
        lowGain.connect(lowPass);
        highGain.connect(lowPass);
        lowPass.connect(playback.output);

        const now = context.currentTime;
        lowOscillator.frequency.setValueAtTime(174.61, now);
        lowOscillator.frequency.linearRampToValueAtTime(196.0, now + 8);
        lowOscillator.frequency.linearRampToValueAtTime(174.61, now + 16);

        highOscillator.frequency.setValueAtTime(261.63, now);
        highOscillator.frequency.linearRampToValueAtTime(293.66, now + 6);
        highOscillator.frequency.linearRampToValueAtTime(246.94, now + 12);
        highOscillator.frequency.linearRampToValueAtTime(261.63, now + 18);

        lowOscillator.start();
        highOscillator.start();
        tremolo.start();

        playback.sources.push(lowOscillator, highOscillator, tremolo);

        if (!options.loop) {
            window.setTimeout(() => {
                void playback.stop();
            }, 7000);
        }

        return playback;
    }

    private applyFadeIn(output: GainNode, fadeInMs = 0): void {
        if (!this.context || fadeInMs <= 0) {
            return;
        }

        const target = output.gain.value;
        const now = this.context.currentTime;
        output.gain.setValueAtTime(0.0001, now);
        output.gain.linearRampToValueAtTime(target, now + fadeInMs / 1000);
    }

    private trackSource(playback: PlaybackRecord, source: PlaybackSource, timeoutMs: number): void {
        playback.sources.push(source);

        let cleanedUp = false;
        const cleanupOnce = () => {
            if (cleanedUp || playback.isStopped) {
                return;
            }

            cleanedUp = true;
            playback.cleanup();
        };

        source.addEventListener('ended', cleanupOnce, { once: true });
        window.setTimeout(cleanupOnce, timeoutMs + 50);
    }

    private clampVolume(volume: number): number {
        return Math.max(0, Math.min(1, volume));
    }

    private log(message: string, error?: unknown): void {
        this.logger?.(message, error);
    }
}
