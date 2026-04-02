/**
 * STT service interface. Implementations injected via DI.
 */

export interface SttHandlers {
    onResult?: (transcript: string) => void;
    onInterim?: (transcript: string) => void;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: string) => void;
}

export interface ISttService {
    isAvailable(): boolean;
    start(lang: string, handlers: SttHandlers): void;
    stop(): void;
}
