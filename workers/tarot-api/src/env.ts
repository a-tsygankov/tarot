/**
 * Cloudflare Worker environment bindings and secrets.
 */
export interface Env {
    // R2 bucket
    R2: R2Bucket;

    // Secrets
    GEMINI_KEY: string;
    ANTHROPIC_KEY: string;
    ELEVENLABS_KEY: string;
    ANALYTICS_KEY: string;
    DEFAULT_VOICE_ID: string;

    // Vars
    ALLOWED_ORIGINS: string;
    TTS_MONTHLY_LIMIT: string;
}
