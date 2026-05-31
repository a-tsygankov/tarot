/**
 * Thin R2 adapter — typed get/put with JSON serialization.
 */

export async function r2GetJson<T>(r2: R2Bucket, key: string): Promise<T | null> {
    const obj = await r2.get(key);
    if (!obj) return null;
    return await obj.json() as T;
}

export async function r2PutJson(r2: R2Bucket, key: string, data: unknown): Promise<void> {
    await r2.put(key, JSON.stringify(data));
}

export async function r2PutJsonWithMeta(
    r2: R2Bucket,
    key: string,
    data: unknown,
    customMetadata: Record<string, string>,
): Promise<void> {
    await r2.put(key, JSON.stringify(data), {
        httpMetadata: { contentType: 'application/json' },
        customMetadata,
    });
}

export interface ListedEntity {
    key: string;
    meta: Record<string, string>;
    uploaded: Date;
}

/**
 * Enumerate every object under `prefix`, returning each one's customMetadata
 * without fetching its body. One subrequest per 1000 objects.
 */
export async function listWithMetadata(r2: R2Bucket, prefix: string): Promise<ListedEntity[]> {
    const results: ListedEntity[] = [];
    let cursor: string | undefined;
    do {
        // `include` is supported at runtime but absent from the older R2ListOptions
        // type bundled with @cloudflare/workers-types; cast through unknown so we
        // can opt into customMetadata-bearing list responses.
        const opts = { prefix, limit: 1000, cursor, include: ['customMetadata'] } as unknown as R2ListOptions;
        const batch = await r2.list(opts);
        for (const o of batch.objects) {
            results.push({ key: o.key, meta: o.customMetadata ?? {}, uploaded: o.uploaded });
        }
        cursor = batch.truncated ? (batch as { cursor?: string }).cursor : undefined;
    } while (cursor);
    return results;
}

export async function r2Exists(r2: R2Bucket, key: string): Promise<boolean> {
    const head = await r2.head(key);
    return head !== null;
}
