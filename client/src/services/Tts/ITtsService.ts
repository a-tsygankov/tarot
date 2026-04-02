import type { IProgressReporter } from '../IProgressReporter.js';

export interface SpeakOptions {
    voiceId?: string;
    speed?: number;
    onStart?: () => void;
    onEnd?: () => void;
}

/**
 * TTS service interface. Implementations injected via DI.
 * - ElevenLabsTtsService: via Worker proxy
 * - BrowserTtsService: speechSynthesis fallback
 * - FallbackTtsService: tries primary, falls back to secondary
 */
export interface ITtsService {
    isAvailable(): boolean;
    speakAsync(text: string, lang: string, options?: SpeakOptions, progress?: IProgressReporter): Promise<void>;
    stop(): void;
    pause(): void;
    resume(): void;
}
