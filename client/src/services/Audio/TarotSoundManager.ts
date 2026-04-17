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
        return this.playOracleBowlHum(context, options);
    }

    async playButtonPress(options: {
        fadeInMs?: number;
        signal?: AbortSignal;
        volume?: number;
    } = {}): Promise<SoundPlayback> {
        const context = this.getContext();
        await this.initialize();
        return this.playButtonPing(context, options);
    }

    async playPanelOpen(options: {
        fadeInMs?: number;
        signal?: AbortSignal;
        volume?: number;
    } = {}): Promise<SoundPlayback> {
        const context = this.getContext();
        await this.initialize();
        return this.playPanelSweep(context, { ...options, closing: false });
    }

    async playPanelClose(options: {
        fadeInMs?: number;
        signal?: AbortSignal;
        volume?: number;
    } = {}): Promise<SoundPlayback> {
        const context = this.getContext();
        await this.initialize();
        return this.playPanelSweep(context, { ...options, closing: true });
    }

    async playOracleArrival(options: {
        fadeInMs?: number;
        signal?: AbortSignal;
        volume?: number;
    } = {}): Promise<SoundPlayback> {
        const context = this.getContext();
        await this.initialize();
        return this.playOracleArrivalChord(context, options);
    }

    async playErrorPulse(options: {
        fadeInMs?: number;
        signal?: AbortSignal;
        volume?: number;
    } = {}): Promise<SoundPlayback> {
        const context = this.getContext();
        await this.initialize();
        return this.playErrorPulseTone(context, options);
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

    private playOracleBowlHum(
        context: AudioContext,
        options: { fadeInMs?: number; loop?: boolean; signal?: AbortSignal; volume?: number },
    ): SoundPlayback {
        const playback = this.createPlayback('oracle-waiting', options.volume ?? 0.34);
        this.attachAbortSignal(playback, options.signal);
        this.applyFadeIn(playback.output, options.fadeInMs ?? 650);

        const masterFilter = context.createBiquadFilter();
        masterFilter.type = 'lowpass';
        masterFilter.frequency.value = 1800;
        masterFilter.Q.value = 0.8;

        const shimmerFilter = context.createBiquadFilter();
        shimmerFilter.type = 'bandpass';
        shimmerFilter.frequency.value = 1600;
        shimmerFilter.Q.value = 1.4;

        masterFilter.connect(playback.output);
        shimmerFilter.connect(playback.output);

        const baseFrequencies = [220, 330, 440, 554, 660];
        const now = context.currentTime;
        const cycleSeconds = 10;

        for (const [index, baseFrequency] of baseFrequencies.entries()) {
            const primary = context.createOscillator();
            primary.type = 'sine';
            primary.frequency.value = baseFrequency;

            const detuned = context.createOscillator();
            detuned.type = 'sine';
            detuned.frequency.value = baseFrequency + 1.2;

            const toneGain = context.createGain();
            const targetGain = 0.04 / (index + 1);
            toneGain.gain.setValueAtTime(0, now);
            toneGain.gain.linearRampToValueAtTime(targetGain, now + 2);

            if (!options.loop) {
                toneGain.gain.setValueAtTime(targetGain, now + cycleSeconds - 1.5);
                toneGain.gain.linearRampToValueAtTime(0.0001, now + cycleSeconds);
            }

            primary.connect(toneGain);
            detuned.connect(toneGain);
            toneGain.connect(masterFilter);

            primary.start();
            detuned.start();
            playback.sources.push(primary, detuned);

            if (!options.loop) {
                primary.stop(now + cycleSeconds + 0.02);
                detuned.stop(now + cycleSeconds + 0.02);
            }
        }

        const shimmer = context.createOscillator();
        shimmer.type = 'sine';
        shimmer.frequency.value = 1760;

        const shimmerGain = context.createGain();
        shimmerGain.gain.setValueAtTime(0, now);
        shimmerGain.gain.linearRampToValueAtTime(0.01, now + 3);
        if (!options.loop) {
            shimmerGain.gain.setValueAtTime(0.01, now + cycleSeconds - 2);
            shimmerGain.gain.linearRampToValueAtTime(0.0001, now + cycleSeconds);
        }

        const lfo = context.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 3;

        const lfoGain = context.createGain();
        lfoGain.gain.value = 0.006;

        lfo.connect(lfoGain);
        lfoGain.connect(shimmerGain.gain);
        shimmer.connect(shimmerGain);
        shimmerGain.connect(shimmerFilter);

        shimmer.start();
        lfo.start();
        playback.sources.push(shimmer, lfo);

        if (!options.loop) {
            shimmer.stop(now + cycleSeconds + 0.02);
            lfo.stop(now + cycleSeconds + 0.02);
            window.setTimeout(() => {
                void playback.stop();
            }, cycleSeconds * 1000);
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

    private playButtonPing(
        context: AudioContext,
        options: { fadeInMs?: number; signal?: AbortSignal; volume?: number },
    ): SoundPlayback {
        const playback = this.createPlayback('button-press', options.volume ?? 0.6);
        this.attachAbortSignal(playback, options.signal);
        this.applyFadeIn(playback.output, options.fadeInMs);

        const osc = context.createOscillator();
        osc.type = 'triangle';
        const gain = context.createGain();
        const filter = context.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 980;
        filter.Q.value = 1.1;

        const now = context.currentTime;
        osc.frequency.setValueAtTime(720, now);
        osc.frequency.exponentialRampToValueAtTime(980, now + 0.05);
        osc.frequency.exponentialRampToValueAtTime(760, now + 0.14);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.22, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.17);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(playback.output);

        this.trackSource(playback, osc, 220);
        osc.start();
        osc.stop(now + 0.18);

        return playback;
    }

    private playPanelSweep(
        context: AudioContext,
        options: { fadeInMs?: number; signal?: AbortSignal; volume?: number; closing?: boolean },
    ): SoundPlayback {
        const durationSeconds = options.closing ? 0.24 : 0.32;
        const playback = this.createPlayback(options.closing ? 'panel-close' : 'panel-open', options.volume ?? 0.68);
        this.attachAbortSignal(playback, options.signal);

        const bufferLength = Math.floor(context.sampleRate * durationSeconds);
        const buffer = context.createBuffer(1, bufferLength, context.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferLength; i += 1) {
            const t = i / context.sampleRate;
            const envelope = options.closing
                ? Math.exp(-t * 8.4)
                : Math.sin(Math.min(1, t / durationSeconds) * Math.PI) * Math.exp(-t * 2.8);
            data[i] = ((Math.random() * 2 - 1) * 0.07) * envelope;
        }

        const source = context.createBufferSource();
        source.buffer = buffer;

        const bandPass = context.createBiquadFilter();
        bandPass.type = 'bandpass';
        bandPass.frequency.value = options.closing ? 1350 : 980;
        bandPass.Q.value = 0.9;

        const gain = context.createGain();
        gain.gain.value = options.closing ? 0.78 : 0.9;

        source.connect(bandPass);
        bandPass.connect(gain);
        gain.connect(playback.output);

        this.trackSource(playback, source, durationSeconds * 1000);
        this.applyFadeIn(playback.output, options.fadeInMs);
        source.start();

        return playback;
    }

    private playOracleArrivalChord(
        context: AudioContext,
        options: { fadeInMs?: number; signal?: AbortSignal; volume?: number },
    ): SoundPlayback {
        const playback = this.createPlayback('oracle-arrival', options.volume ?? 0.78);
        this.attachAbortSignal(playback, options.signal);
        this.applyFadeIn(playback.output, options.fadeInMs);

        const now = context.currentTime;
        const chord = [261.63, 329.63, 392.0];

        for (const [index, frequency] of chord.entries()) {
            const osc = context.createOscillator();
            osc.type = index === 0 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(frequency, now);
            osc.frequency.linearRampToValueAtTime(frequency * 1.01, now + 0.7);

            const gain = context.createGain();
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.linearRampToValueAtTime(0.12 / (index + 1), now + 0.08);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);

            const filter = context.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 1800;

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(playback.output);

            this.trackSource(playback, osc, 1100);
            osc.start();
            osc.stop(now + 1);
        }

        return playback;
    }

    private playErrorPulseTone(
        context: AudioContext,
        options: { fadeInMs?: number; signal?: AbortSignal; volume?: number },
    ): SoundPlayback {
        const playback = this.createPlayback('error-pulse', options.volume ?? 0.52);
        this.attachAbortSignal(playback, options.signal);
        this.applyFadeIn(playback.output, options.fadeInMs);

        const now = context.currentTime;
        const osc = context.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(170, now + 0.18);

        const gain = context.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

        const filter = context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 620;
        filter.Q.value = 1;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(playback.output);

        this.trackSource(playback, osc, 280);
        osc.start();
        osc.stop(now + 0.24);

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
