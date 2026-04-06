import { TarotSoundManager } from './TarotSoundManager.js';
import type { IAudioCueService } from './IAudioCueService.js';

export class AudioCueService implements IAudioCueService {
    private readonly soundManager = new TarotSoundManager({
        logger: (message, error) => console.warn(message, error),
    });

    private oracleWaitingPlayback: { stop: (options?: { durationMs?: number }) => Promise<void> } | null = null;

    async playCardReveal(): Promise<void> {
        try {
            await this.soundManager.playCardReveal({ fadeInMs: 20 });
        } catch (error) {
            console.warn('Card reveal sound failed:', error);
        }
    }

    async playCardPreviewOpen(): Promise<void> {
        try {
            await this.soundManager.playCardPreview({
                fadeInMs: 8,
                closing: false,
                volume: 0.72,
            });
        } catch (error) {
            console.warn('Card preview open sound failed:', error);
        }
    }

    async playCardPreviewClose(): Promise<void> {
        try {
            await this.soundManager.playCardPreview({
                fadeInMs: 4,
                closing: true,
                volume: 0.64,
            });
        } catch (error) {
            console.warn('Card preview close sound failed:', error);
        }
    }

    async startOracleWaiting(): Promise<void> {
        try {
            await this.stopOracleWaiting();
            this.oracleWaitingPlayback = await this.soundManager.playOracleWaiting({
                fadeInMs: 250,
                loop: true,
            });
        } catch (error) {
            console.warn('Oracle waiting sound failed:', error);
        }
    }

    async stopOracleWaiting(): Promise<void> {
        if (!this.oracleWaitingPlayback) {
            return;
        }

        const playback = this.oracleWaitingPlayback;
        this.oracleWaitingPlayback = null;
        await playback.stop({ durationMs: 220 });
    }
}
