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

    async playCardPreview(options: {
        fadeInMs?: number;
        signal?: AbortSignal;
        closing?: boolean;
        volume?: number;
    } = {}): Promise<SoundPlayback> {
        const context = this.getContext();
        await this.initialize();
        return this.playParchmentSwipe(context, options);
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
        const playback = this.createPlayback('oracle-waiting', options.volume ?? 0.3);
        this.attachAbortSignal(playback, options.signal);
        this.applyFadeIn(playback.output, options.fadeInMs ?? 420);

        const orbOscillator = context.createOscillator();
        orbOscillator.type = 'sine';
        orbOscillator.frequency.value = 146.83;

        const shimmerOscillator = context.createOscillator();
        shimmerOscillator.type = 'triangle';
        shimmerOscillator.frequency.value = 293.66;

        const haloOscillator = context.createOscillator();
        haloOscillator.type = 'sine';
        haloOscillator.frequency.value = 440;

        const orbGain = context.createGain();
        orbGain.gain.value = 0.16;

        const shimmerGain = context.createGain();
        shimmerGain.gain.value = 0.045;

        const haloGain = context.createGain();
        haloGain.gain.value = 0.03;

        const orbFilter = context.createBiquadFilter();
        orbFilter.type = 'lowpass';
        orbFilter.frequency.value = 620;
        orbFilter.Q.value = 1.3;

        const shimmerFilter = context.createBiquadFilter();
        shimmerFilter.type = 'bandpass';
        shimmerFilter.frequency.value = 1180;
        shimmerFilter.Q.value = 1.8;

        const haloFilter = context.createBiquadFilter();
        haloFilter.type = 'highpass';
        haloFilter.frequency.value = 900;
        haloFilter.Q.value = 0.7;

        const masterTone = context.createBiquadFilter();
        masterTone.type = 'lowpass';
        masterTone.frequency.value = 1500;
        masterTone.Q.value = 0.9;

        const pulseLfo = context.createOscillator();
        pulseLfo.type = 'sine';
        pulseLfo.frequency.value = 0.11;

        const pulseDepth = context.createGain();
        pulseDepth.gain.value = 0.028;

        const shimmerLfo = context.createOscillator();
        shimmerLfo.type = 'sine';
        shimmerLfo.frequency.value = 0.19;

        const shimmerDepth = context.createGain();
        shimmerDepth.gain.value = 80;

        const haloLfo = context.createOscillator();
        haloLfo.type = 'triangle';
        haloLfo.frequency.value = 0.31;

        const haloDepth = context.createGain();
        haloDepth.gain.value = 0.012;

        const noiseBufferLength = Math.floor(context.sampleRate * 2.8);
        const noiseBuffer = context.createBuffer(1, noiseBufferLength, context.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseBufferLength; i += 1) {
            const previous = i > 0 ? noiseData[i - 1] : 0;
            noiseData[i] = (previous * 0.985) + ((Math.random() * 2 - 1) * 0.018);
        }

        const noiseSource = context.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;

        const noiseFilter = context.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 720;
        noiseFilter.Q.value = 0.7;

        const noiseGain = context.createGain();
        noiseGain.gain.value = 0.038;

        pulseLfo.connect(pulseDepth);
        pulseDepth.connect(orbGain.gain);

        shimmerLfo.connect(shimmerDepth);
        shimmerDepth.connect(shimmerFilter.frequency);

        haloLfo.connect(haloDepth);
        haloDepth.connect(haloGain.gain);

        orbOscillator.connect(orbGain);
        orbGain.connect(orbFilter);
        orbFilter.connect(masterTone);

        shimmerOscillator.connect(shimmerGain);
        shimmerGain.connect(shimmerFilter);
        shimmerFilter.connect(masterTone);

        haloOscillator.connect(haloGain);
        haloGain.connect(haloFilter);
        haloFilter.connect(masterTone);

        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(masterTone);

        masterTone.connect(playback.output);

        const now = context.currentTime;
        orbOscillator.frequency.setValueAtTime(146.83, now);
        orbOscillator.frequency.linearRampToValueAtTime(155.56, now + 7.5);
        orbOscillator.frequency.linearRampToValueAtTime(146.83, now + 15);

        shimmerOscillator.frequency.setValueAtTime(293.66, now);
        shimmerOscillator.frequency.linearRampToValueAtTime(329.63, now + 5.5);
        shimmerOscillator.frequency.linearRampToValueAtTime(277.18, now + 11);
        shimmerOscillator.frequency.linearRampToValueAtTime(293.66, now + 16.5);

        haloOscillator.frequency.setValueAtTime(440, now);
        haloOscillator.frequency.linearRampToValueAtTime(493.88, now + 8);
        haloOscillator.frequency.linearRampToValueAtTime(466.16, now + 15);

        orbOscillator.start();
        shimmerOscillator.start();
        haloOscillator.start();
        pulseLfo.start();
        shimmerLfo.start();
        haloLfo.start();
        noiseSource.start();

        playback.sources.push(
            orbOscillator,
            shimmerOscillator,
            haloOscillator,
            pulseLfo,
            shimmerLfo,
            haloLfo,
            noiseSource,
        );

        if (!options.loop) {
            window.setTimeout(() => {
                void playback.stop();
            }, 7000);
        }

        return playback;
    }

    private playParchmentSwipe(
        context: AudioContext,
        options: { fadeInMs?: number; signal?: AbortSignal; closing?: boolean; volume?: number },
    ): SoundPlayback {
        const durationSeconds = options.closing ? 0.28 : 0.34;
        const playback = this.createPlayback('card-preview', options.volume ?? 0.7);
        this.attachAbortSignal(playback, options.signal);

        const bufferLength = Math.floor(context.sampleRate * durationSeconds);
        const buffer = context.createBuffer(1, bufferLength, context.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferLength; i += 1) {
            const t = i / context.sampleRate;
            const sweep = options.closing
                ? Math.exp(-t * 7.2)
                : Math.sin(Math.min(1, t / durationSeconds) * Math.PI) * Math.exp(-t * 2.6);
            const grain = (Math.random() * 2 - 1) * 0.095;
            const crackle = Math.random() < 0.045 ? (Math.random() - 0.5) * 0.8 : 0;
            data[i] = (grain + crackle) * sweep;
        }

        const source = context.createBufferSource();
        source.buffer = buffer;

        const highPass = context.createBiquadFilter();
        highPass.type = 'highpass';
        highPass.frequency.value = options.closing ? 540 : 460;

        const bandPass = context.createBiquadFilter();
        bandPass.type = 'bandpass';
        bandPass.frequency.value = options.closing ? 1900 : 1560;
        bandPass.Q.value = 1.1;

        const softGain = context.createGain();
        softGain.gain.value = options.closing ? 0.78 : 0.88;

        source.connect(highPass);
        highPass.connect(bandPass);
        bandPass.connect(softGain);
        softGain.connect(playback.output);

        this.trackSource(playback, source, durationSeconds * 1000);
        this.applyFadeIn(playback.output, options.fadeInMs);
        source.start();

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
