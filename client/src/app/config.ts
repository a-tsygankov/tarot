/**
 * Single source of truth for all configurable values.
 * No hardcoded values in service or UI code.
 */

export interface LanguageConfig {
    code: string;
    label: string;
    sttLang: string;
    voiceId: string | null;
}

export interface ThemeConfig {
    id: string;
    label: string;
}

export const CONFIG = {
    apiBase: 'https://tarot-api.tarotoracle.workers.dev',

    languages: [
        { code: 'ENG', label: 'English',    sttLang: 'en-US', voiceId: 'MKlLqCItoCkvdhrxgtLv' },
        { code: 'RUS', label: 'Русский',    sttLang: 'ru-RU', voiceId: 'GN4wbsbejSnGSa1AzjH5' },
        { code: 'UKR', label: 'Українська', sttLang: 'uk-UA', voiceId: null },
        { code: 'DEU', label: 'Deutsch',    sttLang: 'de-DE', voiceId: null },
        { code: 'AZE', label: 'Azərbaycan', sttLang: 'az-AZ', voiceId: null },
    ] satisfies LanguageConfig[],

    tones: ['Mystical', 'Ironic', 'Serious', 'Gentle'] as const,

    themes: [
        { id: 'dusk',      label: 'Dusk' },
        { id: 'midnight',  label: 'Midnight' },
        { id: 'parchment', label: 'Parchment' },
        { id: 'forest',    label: 'Forest' },
    ] satisfies ThemeConfig[],

    topics: ['Love', 'Career', 'Health', 'Spirit', 'Finance', 'Change'] as const,

    tts: {
        provider: 'elevenlabs' as const,
        defaultModel: 'eleven_flash_v2_5',
        defaultSpeed: 1.0,
        fallbackToBrowser: true,
    },

    stt: {
        provider: 'browser' as const,
    },

    retryCount: 2,
    readingTimeoutMs: 30_000,
    langDebounceSec: 4,
    maxQaHistoryInPrompt: 5,
    maxFollowUpsPerGame: 10,

    rateLimit: {
        readingsPerHour: 20,
        eventsPerMinute: 100,
    },

    version: '2.3.0',
    apiVersion: '2.0',
    debugTripleTapMs: 2000,
} as const;

export type AppConfig = typeof CONFIG;
