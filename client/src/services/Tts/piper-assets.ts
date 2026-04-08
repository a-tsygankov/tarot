import { PIPER_VOICE_PATHS } from '@shared/config/piper-voice-map.js';
import { PIPER_ONNX_RUNTIME_FILES, PIPER_PHONEMIZE_RUNTIME_FILES } from '@shared/config/piper-runtime.js';
import type { PiperAssetManifest, PiperVoiceAssetManifestEntry } from '@shared/contracts/piper-contracts.js';
import type { AppConfig } from '../../app/config.js';

export function buildPiperRuntimeUrls(config: AppConfig): string[] {
    const base = trimTrailingSlash(config.tts.piper.assetBase);
    return [
        ...PIPER_ONNX_RUNTIME_FILES.map(file => `${base}/piper/runtime/onnx/${file}`),
        ...PIPER_PHONEMIZE_RUNTIME_FILES.map(file => `${base}/piper/runtime/piper/${file}`),
    ];
}

export function buildPiperVoiceEntry(_config: AppConfig, languageCode: string, voiceId: string): PiperVoiceAssetManifestEntry {
    const relativeModelPath = PIPER_VOICE_PATHS[voiceId as keyof typeof PIPER_VOICE_PATHS];
    if (!relativeModelPath) {
        throw new Error(`Unknown Piper voiceId: ${voiceId}`);
    }

    return {
        voiceId,
        languageCode,
        modelPath: `/piper/voices/${relativeModelPath}`,
        configPath: `/piper/voices/${relativeModelPath}.json`,
    };
}

export function buildPiperManifest(config: AppConfig): PiperAssetManifest {
    const voices = config.languages
        .filter(language => language.piperVoiceId)
        .map(language => buildPiperVoiceEntry(config, language.code, language.piperVoiceId!));

    return {
        version: config.version,
        runtime: {
            onnx: [...PIPER_ONNX_RUNTIME_FILES].map(file => `/piper/runtime/onnx/${file}`),
            piper: [...PIPER_PHONEMIZE_RUNTIME_FILES].map(file => `/piper/runtime/piper/${file}`),
        },
        voices,
    };
}

export function buildPiperWarmCacheUrls(config: AppConfig, voiceId: string | null): string[] {
    const runtimeUrls = buildPiperRuntimeUrls(config);
    if (!voiceId) {
        return runtimeUrls;
    }

    const relativeModelPath = PIPER_VOICE_PATHS[voiceId as keyof typeof PIPER_VOICE_PATHS];
    if (!relativeModelPath) {
        return runtimeUrls;
    }

    const base = trimTrailingSlash(config.tts.piper.assetBase);
    return [
        ...runtimeUrls,
        `${base}/piper/voices/${relativeModelPath}`,
        `${base}/piper/voices/${relativeModelPath}.json`,
    ];
}

function trimTrailingSlash(value: string): string {
    return value.replace(/\/+$/, '');
}
