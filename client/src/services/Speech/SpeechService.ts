import type { UserContext } from '../../models/UserContext.js';
import type { IProgressReporter } from '../IProgressReporter.js';
import type { ITtsService } from '../Tts/ITtsService.js';
import type { ISpeechService } from './ISpeechService.js';
import { SpeechPreferencesResolver } from './SpeechPreferencesResolver.js';

export class SpeechService implements ISpeechService {
    constructor(
        private readonly tts: ITtsService,
        private readonly preferences: SpeechPreferencesResolver,
    ) {}

    isAvailable(): boolean {
        return this.tts.isAvailable();
    }

    async speakReadingAsync(
        text: string,
        userContext: UserContext,
        progress?: IProgressReporter,
    ): Promise<void> {
        await this.speakAsync(text, userContext, progress);
    }

    async speakConversationAsync(
        text: string,
        userContext: UserContext,
        progress?: IProgressReporter,
    ): Promise<void> {
        await this.speakAsync(text, userContext, progress);
    }

    stop(): void {
        this.tts.stop();
    }

    pause(): void {
        this.tts.pause();
    }

    resume(): void {
        this.tts.resume();
    }

    private async speakAsync(
        text: string,
        userContext: UserContext,
        progress?: IProgressReporter,
    ): Promise<void> {
        if (userContext.muted) {
            throw new Error('Audio is muted in Settings.');
        }

        if (!this.preferences.resolveVoiceEnabled(userContext)) {
            throw new Error('Voice playback is turned off in Settings.');
        }

        const locale = this.preferences.resolveBrowserLocale(userContext);
        const options = this.preferences.resolveSpeechOptions(userContext);
        await this.tts.speakAsync(text, locale, options, progress);
    }
}
