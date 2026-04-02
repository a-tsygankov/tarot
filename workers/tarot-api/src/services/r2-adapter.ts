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

export async function r2Exists(r2: R2Bucket, key: string): Promise<boolean> {
    const head = await r2.head(key);
    return head !== null;
}
