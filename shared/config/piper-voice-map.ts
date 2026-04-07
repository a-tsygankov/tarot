export const PIPER_VOICE_PATHS = {
    'de_DE-mls-medium': 'de/de_DE/mls/medium/de_DE-mls-medium.onnx',
    'en_US-hfc_female-medium': 'en/en_US/hfc_female/medium/en_US-hfc_female-medium.onnx',
    'ru_RU-irina-medium': 'ru/ru_RU/irina/medium/ru_RU-irina-medium.onnx',
    'uk_UA-ukrainian_tts-medium': 'uk/uk_UA/ukrainian_tts/medium/uk_UA-ukrainian_tts-medium.onnx',
} as const;

export type PiperVoiceId = keyof typeof PIPER_VOICE_PATHS;
