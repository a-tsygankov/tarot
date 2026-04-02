import type { ITtsService, SpeakOptions } from './ITtsService.js';
import type { IProgressReporter } from '../IProgressReporter.js';

/**
 * Browser speechSynthesis TTS fallback.
 * Free, lower quality, but always available in modern browsers.
 */
export class BrowserTtsService implements ITtsService {
    isAvailable(): boolean {
        return 'speechSynthesis' in window;
    }

    async speakAsync(
        text: string,
        lang: string,
        options: SpeakOptions = {},
        progress?: IProgressReporter,
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.isAvailable()) {
                reject(new Error('speechSynthesis not available'));
                return;
            }

            progress?.report('Speaking via browser...', 0);
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;
            utterance.rate = options.speed ?? 1.0;
            utterance.onstart = () => {
                progress?.report('Speaking...', 50);
                options.onStart?.();
            };
            utterance.onend = () => {
                progress?.report('Done', 100);
                options.onEnd?.();
                resolve();
            };
            utterance.onerror = (e) => reject(new Error('Speech error: ' + e.error));

            speechSynthesis.speak(utterance);
        });
    }

    stop(): void {
        speechSynthesis.cancel();
    }

    pause(): void {
        speechSynthesis.pause();
    }

    resume(): void {
        speechSynthesis.resume();
    }
}
