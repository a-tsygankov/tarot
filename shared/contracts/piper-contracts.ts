export interface PiperVoiceAssetManifestEntry {
    voiceId: string;
    languageCode: string;
    modelPath: string;
    configPath: string;
}

export interface PiperAssetManifest {
    version: string;
    runtime: {
        onnx: string[];
        piper: string[];
    };
    voices: PiperVoiceAssetManifestEntry[];
}
