import type { ISttService, SttHandlers } from '../Stt/ISttService.js';
import type { ITtsService } from '../Tts/ITtsService.js';
import type { IApiService } from '../IApiService.js';
import type { GameContext } from '../../models/GameContext.js';
import type { UserContext } from '../../models/UserContext.js';

export type VoiceModeState = 'idle' | 'listening' | 'processing' | 'speaking';

export interface VoiceModeCallbacks {
    onStateChange: (state: VoiceModeState) => void;
    onUserTranscript: (text: string) => void;
    onOracleResponse: (text: string, digest: string) => void;
    onError: (error: string) => void;
}

/**
 * Voice Mode — continuous STT→AI→TTS conversation loop.
 *
 * Flow: listen → transcribe → send follow-up → TTS response → listen again
 * The loop continues until explicitly stopped.
 */
export class VoiceModeService {
    private _state: VoiceModeState = 'idle';
    private _active = false;
    private _callbacks: VoiceModeCallbacks | null = null;

    constructor(
        private readonly stt: ISttService,
        private readonly tts: ITtsService,
        private readonly api: IApiService,
        private readonly userContext: UserContext,
        private readonly sttLang: string,
    ) {}

    get state(): VoiceModeState {
        return this._state;
    }

    get isActive(): boolean {
        return this._active;
    }

    /**
     * Start the voice conversation loop.
     */
    start(game: GameContext, callbacks: VoiceModeCallbacks): void {
        if (!this.stt.isAvailable()) {
            callbacks.onError('Speech recognition is not available in this browser.');
            return;
        }

        this._active = true;
        this._callbacks = callbacks;
        this._setState('listening');
        this._listen(game);
    }

    /**
     * Stop the voice loop. Halts STT, TTS, and resets state.
     */
    stop(): void {
        this._active = false;
        this.stt.stop();
        this.tts.stop();
        this._setState('idle');
    }

    private _setState(state: VoiceModeState): void {
        this._state = state;
        this._callbacks?.onStateChange(state);
    }

    private _listen(game: GameContext): void {
        if (!this._active) return;

        this._setState('listening');

        const handlers: SttHandlers = {
            onResult: (transcript: string) => {
                if (!this._active || !transcript.trim()) return;
                this._callbacks?.onUserTranscript(transcript);
                this._process(game, transcript);
            },
            onError: (err: string) => {
                if (!this._active) return;
                this._callbacks?.onError(`Speech recognition: ${err}`);
                // Try to restart listening after a brief pause
                setTimeout(() => this._listen(game), 1000);
            },
            onEnd: () => {
                // STT ended without result — restart if still active
                if (this._active && this._state === 'listening') {
                    setTimeout(() => this._listen(game), 500);
                }
            },
        };

        this.stt.start(this.sttLang, handlers);
    }

    private async _process(game: GameContext, question: string): Promise<void> {
        if (!this._active) return;

        this._setState('processing');

        try {
            const response = await this.api.askFollowUpAsync(game, question);

            // Store digests in game context
            game.addQA(response.questionDigest, response.answerDigest);

            if (response.userContextDelta) {
                this.userContext.applyAiUpdate(response.userContextDelta);
            }

            this._callbacks?.onOracleResponse(response.answer, response.answerDigest);

            // Speak the response, then listen again
            await this._speak(game, response.answer);
        } catch (err) {
            if (!this._active) return;
            this._callbacks?.onError(
                `AI response failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
            );
            // Continue listening despite error
            this._listen(game);
        }
    }

    private async _speak(game: GameContext, text: string): Promise<void> {
        if (!this._active) return;

        this._setState('speaking');

        try {
            const lang = this.userContext.language ?? 'ENG';
            await this.tts.speakAsync(text, lang);
        } catch {
            // TTS failure is non-fatal — continue the loop
        }

        // After speaking (or TTS failure), start listening again
        if (this._active) {
            this._listen(game);
        }
    }
}
