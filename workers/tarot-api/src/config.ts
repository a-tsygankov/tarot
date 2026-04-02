/**
 * Worker-side configuration: model lists, defaults, rate limits.
 */

export const WORKER_CONFIG = {
    version: '2.3.0',
    apiVersion: '2.0',
    supportedApiVersions: ['2.0'],
    minClientVersion: '2.0.0',

    ai: {
        primaryProvider: 'gemini' as const,
        fallbackProvider: 'anthropic' as const,
        models: {
            gemini: {
                fast: 'gemini-2.5-flash',
                quality: 'gemini-2.5-pro',
            },
            anthropic: {
                default: 'claude-sonnet-4-6',
            },
        },
    },

    tts: {
        defaultModel: 'eleven_flash_v2_5',
        defaultVoiceSettings: {
            stability: 0.6,
            similarity_boost: 0.8,
            speed: 1.0,
        },
    },

    rateLimit: {
        readingsPerHour: 20,
        eventsPerMinute: 100,
    },

    schemaVersion: '2026.04.01-01',
} as const;

/**
 * Adaptive token budget based on conversation depth.
 */
export function getTokenBudget(turnCount: number) {
    if (turnCount === 0) return { contextMax: 500, responseMax: 3500 };
    if (turnCount <= 2) return { contextMax: 700, responseMax: 3500 };
    if (turnCount <= 5) return { contextMax: 1000, responseMax: 4500 };
    return { contextMax: 1200, responseMax: 5500 };
}
