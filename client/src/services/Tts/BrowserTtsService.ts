import type { ITtsService, SpeakOptions } from './ITtsService.js';
import type { IProgressReporter } from '../IProgressReporter.js';
import { recordTtsDiagnostics } from './tts-diagnostics.js';

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
        recordTtsDiagnostics({
            provider: 'browser',
            phase: 'start',
            timestamp: new Date().toISOString(),
            details: {
                requestedLanguage: lang,
                textLength: text.length,
                speed: options.speed ?? 1.0,
            },
        });
        const voices = await this.ensureVoicesLoaded();
        const voice = this.findBestVoice(voices, lang);
        recordTtsDiagnostics({
            provider: 'browser',
            phase: 'voices',
            timestamp: new Date().toISOString(),
            details: {
                requestedLanguage: lang,
                voicesAvailable: voices.length,
                selectedVoiceName: voice?.name ?? null,
                selectedVoiceLang: voice?.lang ?? null,
                selectedVoiceLocalService: voice?.localService ?? null,
                selectedVoiceDefault: voice?.default ?? null,
            },
        });

        return new Promise((resolve, reject) => {
            if (!this.isAvailable()) {
                const error = new Error('speechSynthesis not available');
                recordTtsDiagnostics({
                    provider: 'browser',
                    phase: 'error',
                    timestamp: new Date().toISOString(),
                    details: { message: error.message },
                });
                reject(error);
                return;
            }

            progress?.report('Speaking via browser...', 0);
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = voice?.lang ?? lang;
            if (voice) {
                utterance.voice = voice;
            }
            utterance.rate = options.speed ?? 1.0;
            utterance.onstart = () => {
                recordTtsDiagnostics({
                    provider: 'browser',
                    phase: 'speak',
                    timestamp: new Date().toISOString(),
                    details: {
                        utteranceLang: utterance.lang,
                        voiceName: utterance.voice?.name ?? null,
                        voiceLang: utterance.voice?.lang ?? null,
                        speaking: speechSynthesis.speaking,
                        pending: speechSynthesis.pending,
                    },
                });
                progress?.report('Speaking...', 50);
                options.onStart?.();
            };
            utterance.onend = () => {
                recordTtsDiagnostics({
                    provider: 'browser',
                    phase: 'success',
                    timestamp: new Date().toISOString(),
                    details: {
                        utteranceLang: utterance.lang,
                        voiceName: utterance.voice?.name ?? null,
                        voiceLang: utterance.voice?.lang ?? null,
                    },
                });
                progress?.report('Done', 100);
                options.onEnd?.();
                resolve();
            };
            utterance.onerror = (e) => {
                recordTtsDiagnostics({
                    provider: 'browser',
                    phase: 'error',
                    timestamp: new Date().toISOString(),
                    details: {
                        utteranceLang: utterance.lang,
                        voiceName: utterance.voice?.name ?? null,
                        voiceLang: utterance.voice?.lang ?? null,
                        error: e.error,
                    },
                });
                reject(new Error('Speech error: ' + e.error));
            };

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
