import type { ISttService, SttHandlers } from './ISttService.js';

// Web Speech API types
interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
    error: string;
}

/**
 * Browser Web Speech API STT implementation.
 */
export class BrowserSttService implements ISttService {
    private recognition: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
    private available: boolean;
    private activeSessionId = 0;
    private listening = false;

    constructor() {
        const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
        this.available = !!SR;
        if (this.available) {
            this.recognition = new SR();
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
        }
    }

    isAvailable(): boolean {
        return this.available;
    }

    start(lang: string, handlers: SttHandlers): void {
        if (!this.available || !this.recognition) {
            handlers.onError?.('STT not available');
            return;
        }

        if (this.listening) {
            this.forceReleaseRecognition();
        }

        const sessionId = ++this.activeSessionId;
        this.listening = false;

        this.recognition.lang = lang;

        this.recognition.onresult = (e: SpeechRecognitionEvent) => {
            if (sessionId !== this.activeSessionId) return;
            const result = e.results[e.results.length - 1];
            if ((result as any).isFinal) {
                handlers.onResult?.(result[0].transcript);
                this.listening = false;
                this.stopRecognition('stop');
            } else {
                handlers.onInterim?.(result[0].transcript);
            }
        };

        this.recognition.onstart = () => {
            if (sessionId !== this.activeSessionId) return;
            this.listening = true;
            handlers.onStart?.();
        };
        this.recognition.onend = () => {
            if (sessionId !== this.activeSessionId) return;
            this.listening = false;
            handlers.onEnd?.();
        };
        this.recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
            if (sessionId !== this.activeSessionId) return;
            this.listening = false;
            handlers.onError?.(e.error);
        };

        try {
            this.recognition.start();
        } catch (error) {
            this.listening = false;
            handlers.onError?.(error instanceof Error ? error.message : 'Failed to start speech recognition');
        }
    }

    stop(): void {
        if (!this.recognition) return;
        this.listening = false;
        this.stopRecognition('abort');
    }

    private stopRecognition(mode: 'stop' | 'abort'): void {
        if (!this.recognition) return;
        try {
            const fn = mode === 'abort' && typeof this.recognition.abort === 'function'
                ? this.recognition.abort.bind(this.recognition)
                : this.recognition.stop.bind(this.recognition);
            fn();
        } catch {
            this.forceReleaseRecognition();
        }
    }

    private forceReleaseRecognition(): void {
        if (!this.recognition) return;
        try {
            if (typeof this.recognition.abort === 'function') {
                this.recognition.abort();
            } else if (typeof this.recognition.stop === 'function') {
                this.recognition.stop();
            }
        } catch {
            // Best effort: cleanup local listeners so stale sessions stop affecting UI.
        } finally {
            this.listening = false;
        }
    }
}
