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

        this.recognition.lang = lang;

        this.recognition.onresult = (e: SpeechRecognitionEvent) => {
            const result = e.results[e.results.length - 1];
            if ((result as any).isFinal) {
                handlers.onResult?.(result[0].transcript);
            } else {
                handlers.onInterim?.(result[0].transcript);
            }
        };

        this.recognition.onstart = () => handlers.onStart?.();
        this.recognition.onend = () => handlers.onEnd?.();
        this.recognition.onerror = (e: SpeechRecognitionErrorEvent) => handlers.onError?.(e.error);

        this.recognition.start();
    }

    stop(): void {
        this.recognition?.stop();
    }
}
