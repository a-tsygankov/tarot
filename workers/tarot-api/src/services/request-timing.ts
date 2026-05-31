/**
 * Fire-and-forget request-timing collection. Each entry lands as a small JSON
 * file under analytics/request-timings/{YYYY-MM-DD}/{ts}-{rand}.json so writes
 * never contend with each other (R2 has no append). Failures are swallowed so
 * timing collection never breaks the actual response.
 */
export interface RequestTiming {
    path: string;
    method: string;
    status: number;
    durationMs: number;
    ts: string;
}

export async function recordRequestTiming(r2: R2Bucket, entry: RequestTiming): Promise<void> {
    try {
        const date = entry.ts.slice(0, 10);
        const nonce = Math.random().toString(36).slice(2, 8);
        const key = `analytics/request-timings/${date}/${entry.ts}-${nonce}.json`;
        await r2.put(key, JSON.stringify(entry), {
            httpMetadata: { contentType: 'application/json' },
        });
    } catch (err) {
        console.warn('recordRequestTiming failed:', err instanceof Error ? err.message : err);
    }
}
