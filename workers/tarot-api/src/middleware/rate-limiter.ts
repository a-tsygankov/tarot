/**
 * Simple in-memory rate limiter for Cloudflare Workers.
 * Uses a sliding window with per-IP tracking.
 * Resets across Worker restarts (acceptable for this use case).
 */

interface RateBucket {
    count: number;
    windowStart: number;
}

const buckets = new Map<string, RateBucket>();

// Cleanup stale entries periodically
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60_000;

function cleanup(windowMs: number): void {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
    lastCleanup = now;
    for (const [key, bucket] of buckets) {
        if (now - bucket.windowStart > windowMs * 2) {
            buckets.delete(key);
        }
    }
}

export interface RateLimitConfig {
    /** Maximum requests allowed in the window. */
    maxRequests: number;
    /** Window duration in milliseconds. */
    windowMs: number;
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    retryAfterMs: number;
}

/**
 * Check rate limit for a given key (typically IP + endpoint).
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    cleanup(config.windowMs);

    const bucket = buckets.get(key);

    if (!bucket || now - bucket.windowStart >= config.windowMs) {
        // New window
        buckets.set(key, { count: 1, windowStart: now });
        return { allowed: true, remaining: config.maxRequests - 1, retryAfterMs: 0 };
    }

    if (bucket.count >= config.maxRequests) {
        const retryAfterMs = config.windowMs - (now - bucket.windowStart);
        return { allowed: false, remaining: 0, retryAfterMs };
    }

    bucket.count++;
    return {
        allowed: true,
        remaining: config.maxRequests - bucket.count,
        retryAfterMs: 0,
    };
}

/**
 * Create a rate-limited Response (429).
 */
export function rateLimitResponse(result: RateLimitResult): Response {
    return Response.json(
        {
            error: 'Too many requests',
            retryAfterMs: result.retryAfterMs,
        },
        {
            status: 429,
            headers: {
                'Retry-After': String(Math.ceil(result.retryAfterMs / 1000)),
            },
        },
    );
}
