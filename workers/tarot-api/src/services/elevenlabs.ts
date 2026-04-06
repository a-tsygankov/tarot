import type { Env } from '../env.js';
import { WORKER_CONFIG } from '../config.js';

export class ElevenLabsApiError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly code: string,
        public readonly details: Record<string, unknown>,
    ) {
        super(message);
        this.name = 'ElevenLabsApiError';
    }
}

/**
 * ElevenLabs TTS API caller.
 * Returns the audio response or throws.
 */
export async function callElevenLabs(
    env: Env,
    text: string,
    voiceId: string | null,
    model: string | null,
    speed: number | null,
): Promise<Response> {
    const voice = voiceId || env.DEFAULT_VOICE_ID;
    const settings = WORKER_CONFIG.tts.defaultVoiceSettings;
    if (!env.ELEVENLABS_KEY) {
        throw new ElevenLabsApiError('Missing ElevenLabs API key', 500, 'tts_config_missing_key', {
            hasApiKey: false,
            voiceId: voiceId ?? null,
            effectiveVoiceId: voice ?? null,
        });
    }
    if (!voice) {
        throw new ElevenLabsApiError('Missing ElevenLabs voice id', 500, 'tts_config_missing_voice', {
            requestedVoiceId: voiceId ?? null,
            effectiveVoiceId: null,
        });
    }

    const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
        {
            method: 'POST',
            headers: {
                'xi-api-key': env.ELEVENLABS_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text,
                model_id: model || WORKER_CONFIG.tts.defaultModel,
                voice_settings: {
                    stability: settings.stability,
                    similarity_boost: settings.similarity_boost,
                    speed: speed ?? settings.speed,
                },
            }),
        },
    );

    if (!response.ok) {
        const responseText = await response.text();
        throw new ElevenLabsApiError(
            `ElevenLabs upstream failed: ${response.status} ${response.statusText}`,
            response.status,
            'tts_upstream_failed',
            {
                voiceId: voiceId ?? null,
                effectiveVoiceId: voice,
                model: model || WORKER_CONFIG.tts.defaultModel,
                statusText: response.statusText,
                upstreamBody: responseText.slice(0, 2000),
            },
        );
    }

    return response;
}
