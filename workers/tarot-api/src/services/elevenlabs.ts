import type { Env } from '../env.js';
import { WORKER_CONFIG } from '../config.js';

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
        throw new Error(`ElevenLabs: ${response.status} ${response.statusText}`);
    }

    return response;
}
