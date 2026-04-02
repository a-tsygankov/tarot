import type { Env } from '../env.js';
import type { TtsRequest } from '@shared/contracts/api-contracts.js';
import { callElevenLabs } from '../services/elevenlabs.js';

/**
 * POST /api/tts — ElevenLabs TTS proxy with R2 cache and budget tracking.
 */
export async function handleTts(request: Request, env: Env): Promise<Response> {
    try {
        const body = await request.json() as TtsRequest;

        // Hash for cache key
        const hash = await hashText(body.text + body.language + (body.voiceId || ''));
        const cacheKey = `audio-cache/tts/${hash}.mp3`;

        // Check R2 cache
        const cached = await env.R2.get(cacheKey);
        if (cached) {
            return new Response(cached.body, {
                headers: { 'Content-Type': 'audio/mpeg', 'X-Cache': 'HIT' },
            });
        }

        // Budget check
        const usage = await getMonthlyUsage(env.R2);
        const limit = parseInt(env.TTS_MONTHLY_LIMIT, 10) || 10000;
        if (usage + body.text.length > limit) {
            return Response.json(
                { fallback: true, reason: 'monthly_limit' },
                { status: 429 },
            );
        }

        // Call ElevenLabs
        const audioResponse = await callElevenLabs(
            env,
            body.text,
            body.voiceId ?? null,
            body.model ?? null,
            body.speed ?? null,
        );

        const audioBlob = await audioResponse.arrayBuffer();

        // Cache in R2 and update usage (fire-and-forget)
        env.R2.put(cacheKey, audioBlob).catch(e => console.warn('R2 cache put failed:', e));
        incrementUsage(env.R2, body.text.length).catch(e => console.warn('Usage update failed:', e));

        return new Response(audioBlob, {
            headers: { 'Content-Type': 'audio/mpeg', 'X-Cache': 'MISS' },
        });
    } catch (err) {
        console.error('TTS handler error:', err);
        return Response.json(
            { error: 'TTS failed', message: String(err) },
            { status: 500 },
        );
    }
}

// ── Helpers ──────────────────────────────────────────────────────────

async function hashText(text: string): Promise<string> {
    const data = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

async function getMonthlyUsage(r2: R2Bucket): Promise<number> {
    try {
        const obj = await r2.get('analytics/tts/monthly-chars.json');
        if (!obj) return 0;

        const data = await obj.json() as { month: string; chars: number };
        const currentMonth = new Date().toISOString().slice(0, 7);
        return data.month === currentMonth ? data.chars : 0;
    } catch {
        return 0;
    }
}

async function incrementUsage(r2: R2Bucket, chars: number): Promise<void> {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const current = await getMonthlyUsage(r2);

    await r2.put(
        'analytics/tts/monthly-chars.json',
        JSON.stringify({ month: currentMonth, chars: current + chars }),
    );
}
