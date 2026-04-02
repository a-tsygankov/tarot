import type { OperationOptions } from './IProgressReporter.js';
import type {
    ReadingResponse,
    FollowUpResponse,
    VersionResponse,
} from '@shared/contracts/api-contracts.js';
import type { GameContext } from '../models/GameContext.js';

/**
 * API service interface — all communication with the Worker.
 * Injected via DI. Provides retry, progress, and fallback.
 */
export interface IApiService {
    /** Request an AI reading. */
    fetchReadingAsync(
        game: GameContext,
        options?: OperationOptions,
    ): Promise<ReadingResponse>;

    /** Send a follow-up question. */
    askFollowUpAsync(
        game: GameContext,
        question: string,
        options?: OperationOptions,
    ): Promise<FollowUpResponse>;

    /** Request TTS audio. Returns mp3 blob or throws on quota exceeded. */
    fetchTtsAsync(
        text: string,
        language: string,
        voiceId: string | null,
        options?: OperationOptions,
    ): Promise<Blob>;

    /** Log a session start. */
    logSessionAsync(): Promise<void>;

    /** Log an event (fire-and-forget). */
    logEvent(eventType: string, eventData?: Record<string, unknown>): void;

    /** Check version compatibility. */
    checkVersionAsync(): Promise<VersionResponse>;
}
