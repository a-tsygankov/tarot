import type { IApiService } from './IApiService.js';
import type { OperationOptions } from './IProgressReporter.js';
import type {
    ReadingRequest,
    ReadingResponse,
    FollowUpRequest,
    FollowUpResponse,
    TtsRequest,
    TtsFallbackResponse,
    SessionRequest,
    EventRequest,
    VersionResponse,
} from '@shared/contracts/api-contracts.js';
import type { GameContext } from '../models/GameContext.js';
import type { UserContext } from '../models/UserContext.js';
import type { AppConfig } from '../app/config.js';

/**
 * Worker communication service with retry logic and progress callbacks.
 */
export class ApiService implements IApiService {
    constructor(
        private readonly config: AppConfig,
        private readonly userContext: UserContext,
    ) {}

    async fetchReadingAsync(
        game: GameContext,
        options?: OperationOptions,
    ): Promise<ReadingResponse> {
        options?.progress?.report('Consulting the cards...', 10);

        const body: ReadingRequest = {
            userContext: this.userContext.toApiPayload(),
            gameContext: game.toApiPayload(),
        };

        const result = await this.post<ReadingResponse>(
            '/api/reading',
            body,
            options,
        );

        options?.progress?.report('Reading complete', 100);
        return result;
    }

    async askFollowUpAsync(
        game: GameContext,
        question: string,
        options?: OperationOptions,
    ): Promise<FollowUpResponse> {
        options?.progress?.report('The oracle ponders...', 10);

        const body: FollowUpRequest = {
            userContext: this.userContext.toApiPayload(),
            gameContext: game.toApiPayload(),
            question,
        };

        const result = await this.post<FollowUpResponse>(
            '/api/followup',
            body,
            options,
        );

        options?.progress?.report('Answer received', 100);
        return result;
    }

    async fetchTtsAsync(
        text: string,
        language: string,
        voiceId: string | null,
        options?: OperationOptions,
    ): Promise<Blob> {
        options?.progress?.report('Generating voice...', 10);

        const body: TtsRequest = {
            text,
            language,
            voiceId: voiceId ?? undefined,
            model: this.config.tts.defaultModel,
            speed: this.config.tts.defaultSpeed,
        };

        const response = await this.postRaw('/api/tts', body, options);

        if (response.status === 429) {
            const fallback = await response.json() as TtsFallbackResponse;
            throw new TtsQuotaExceededError(fallback.reason);
        }

        if (!response.ok) {
            throw new Error('TTS request failed: ' + response.status);
        }

        options?.progress?.report('Audio ready', 80);
        return response.blob();
    }

    async logSessionAsync(): Promise<void> {
        const body: SessionRequest = {
            uid: this.userContext.uid,
            sessionId: this.userContext.sessionId,
            appVersion: this.config.version,
            apiVersion: this.config.apiVersion,
            screenWidth: this.userContext.deviceInfo.screenWidth,
            screenHeight: this.userContext.deviceInfo.screenHeight,
        };

        try {
            await this.post('/api/session', body);
        } catch {
            // Fire-and-forget for session logging
        }
    }

    logEvent(eventType: string, eventData?: Record<string, unknown>): void {
        const body: EventRequest = {
            uid: this.userContext.uid,
            sessionId: this.userContext.sessionId,
            eventType,
            eventData,
        };

        // Fire-and-forget
        this.post('/api/event', body).catch(() => {});
    }

    async checkVersionAsync(): Promise<VersionResponse> {
        const response = await fetch(this.config.apiBase + '/api/meta/version');
        if (!response.ok) throw new Error('Version check failed');
        return response.json();
    }

    // ── Private helpers ──────────────────────────────────────────────

    private async post<T>(
        endpoint: string,
        body: unknown,
        options?: OperationOptions,
    ): Promise<T> {
        const response = await this.postRaw(endpoint, body, options);
        if (!response.ok) {
            throw new Error(`API error ${response.status} at ${endpoint}`);
        }
        return response.json();
    }

    private async postRaw(
        endpoint: string,
        body: unknown,
        options?: OperationOptions,
    ): Promise<Response> {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= this.config.retryCount; attempt++) {
            if (options?.cancellationToken?.aborted) {
                throw new Error('Request cancelled');
            }

            try {
                options?.progress?.report(
                    attempt > 0 ? `Retrying (${attempt}/${this.config.retryCount})...` : 'Sending...',
                );

                // Combine cancellation token with request timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(
                    () => controller.abort(),
                    this.config.readingTimeoutMs,
                );

                if (options?.cancellationToken) {
                    options.cancellationToken.addEventListener('abort', () => controller.abort());
                }

                try {
                    const response = await fetch(this.config.apiBase + endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body),
                        signal: controller.signal,
                    });

                    // Handle rate limiting with Retry-After
                    if (response.status === 429 && attempt < this.config.retryCount) {
                        const retryAfter = response.headers.get('Retry-After');
                        const waitMs = retryAfter
                            ? parseInt(retryAfter, 10) * 1000
                            : this.backoffMs(attempt);
                        options?.progress?.report(`Rate limited, waiting ${Math.ceil(waitMs / 1000)}s...`);
                        await this.delay(waitMs);
                        continue;
                    }

                    return response;
                } finally {
                    clearTimeout(timeoutId);
                }
            } catch (err) {
                lastError = err instanceof Error ? err : new Error(String(err));
                if (attempt < this.config.retryCount) {
                    await this.delay(this.backoffMs(attempt));
                }
            }
        }

        throw lastError ?? new Error('Request failed');
    }

    private backoffMs(attempt: number): number {
        return Math.min(1000 * 2 ** attempt, 8000) + Math.random() * 500;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/** Thrown when ElevenLabs TTS quota is exceeded. */
export class TtsQuotaExceededError extends Error {
    constructor(public readonly reason: string) {
        super('TTS quota exceeded: ' + reason);
        this.name = 'TtsQuotaExceededError';
    }
}
