import type { ITtsService, SpeakOptions } from './ITtsService.js';
import type { IProgressReporter } from '../IProgressReporter.js';

/**
 * Browser speechSynthesis TTS fallback.
 * Free, lower quality, but always available in modern browsers.
 */
export class BrowserTtsService implements ITtsService {
    private voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;

    isAvailable(): boolean {
        return 'speechSynthesis' in window;
    }

    async speakAsync(
        text: string,
        lang: string,
        options: SpeakOptions = {},
        progress?: IProgressReporter,
    ): Promise<void> {
        const voices = await this.ensureVoicesLoaded();

        return new Promise((resolve, reject) => {
            if (!this.isAvailable()) {
                reject(new Error('speechSynthesis not available'));
                return;
            }

            progress?.report('Speaking via browser...', 0);
            const utterance = new SpeechSynthesisUtterance(text);
            const voice = this.findBestVoice(voices, lang);
            utterance.lang = voice?.lang ?? lang;
            if (voice) {
                utterance.voice = voice;
            }
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

            speechSynthesis.cancel();
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

    private async ensureVoicesLoaded(): Promise<SpeechSynthesisVoice[]> {
        if (!this.isAvailable()) {
            return [];
        }

        if (!this.voicesReady) {
            this.voicesReady = new Promise((resolve) => {
                const existing = speechSynthesis.getVoices();
                if (existing.length > 0) {
                    resolve(existing);
                    return;
                }

                const handleVoicesChanged = () => {
                    const loadedVoices = speechSynthesis.getVoices();
                    if (loadedVoices.length > 0) {
                        speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
                        resolve(loadedVoices);
                    }
                };

                speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged, { once: true });
                setTimeout(() => {
                    speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
                    resolve(speechSynthesis.getVoices());
                }, 1000);
            });
        }

        return this.voicesReady;
    }

    private findBestVoice(
        voices: SpeechSynthesisVoice[],
        locale: string,
    ): SpeechSynthesisVoice | undefined {
        const normalizedLocale = locale.toLowerCase();
        const languagePrefix = normalizedLocale.split('-')[0];

        return voices.find(voice => voice.lang.toLowerCase() === normalizedLocale)
            ?? voices.find(voice => voice.lang.toLowerCase().startsWith(`${languagePrefix}-`))
            ?? voices.find(voice => voice.lang.toLowerCase() === languagePrefix);
    }
}
