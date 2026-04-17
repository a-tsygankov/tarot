/**
 * Single source of truth for all configurable values.
 * No hardcoded values in service or UI code.
 */

export interface LanguageConfig {
    code: string;
    label: string;
    sttLang: string;
    piperVoiceId: string | null;
    elevenLabsVoiceId?: string | null;
}

export interface ThemeConfig {
    id: string;
    label: string;
}

export const CONFIG = {
    apiBase: import.meta.env.DEV ? '' : 'https://tarot-api.tarotoracle.workers.dev',

    languages: [
        { code: 'ENG', label: 'English',    sttLang: 'en-US', piperVoiceId: 'en_US-hfc_female-medium', elevenLabsVoiceId: 'MKlLqCItoCkvdhrxgtLv' },
        { code: 'RUS', label: 'Русский',    sttLang: 'ru-RU', piperVoiceId: 'ru_RU-irina-medium', elevenLabsVoiceId: 'GN4wbsbejSnGSa1AzjH5' },
        { code: 'UKR', label: 'Українська', sttLang: 'uk-UA', piperVoiceId: 'uk_UA-ukrainian_tts-medium', elevenLabsVoiceId: null },
        { code: 'DEU', label: 'Deutsch',    sttLang: 'de-DE', piperVoiceId: 'de_DE-mls-medium', elevenLabsVoiceId: null },
        { code: 'AZE', label: 'Azərbaycan', sttLang: 'az-AZ', piperVoiceId: null, elevenLabsVoiceId: null },
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
        provider: 'piper' as const,
        debugModel: 'eleven_flash_v2_5',
        defaultSpeed: 1.0,
        fallbackToBrowser: true,
        piper: {
            assetBase: import.meta.env.DEV
                ? '/piper-assets'
                : (import.meta.env.VITE_PIPER_ASSET_BASE ?? 'https://tarot-tts-assets.tarotoracle.workers.dev'),
            serviceWorkerPath: `${import.meta.env.BASE_URL}piper-sw.js`,
            runtimePaths: {
                onnxWasm: 'runtime/onnx/',
                piperBase: 'runtime/piper/',
            },
        },
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

    version: '2.3.1',
    apiVersion: '2.0',
    debugTripleTapMs: 2000,
} as const;

export type AppConfig = typeof CONFIG;
