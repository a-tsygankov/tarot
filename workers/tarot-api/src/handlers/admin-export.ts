import type { Env } from '../env.js';

/**
 * GET /api/admin/export?prefix=entities/users
 * Dumps all R2 objects under a prefix as a JSON array.
 * Protected by ANALYTICS_KEY header check.
 */
export async function handleExport(request: Request, env: Env): Promise<Response> {
    // Auth check
    const authKey = request.headers.get('X-Admin-Key');
    if (authKey !== env.ANALYTICS_KEY) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const prefix = url.searchParams.get('prefix');
    if (!prefix) {
        return Response.json(
            { error: 'Missing ?prefix= parameter' },
            { status: 400 },
        );
    }

    const limit = parseInt(url.searchParams.get('limit') ?? '1000', 10);

    try {
        const documents: unknown[] = [];
        let cursor: string | undefined;
        let totalFetched = 0;

        do {
            const batch = await env.R2.list({
                prefix,
                cursor,
                limit: Math.min(limit - totalFetched, 1000),
            });

            for (const obj of batch.objects) {
                const data = await env.R2.get(obj.key);
                if (data) {
                    try {
                        const parsed = await data.json();
                        documents.push({ _key: obj.key, ...parsed as object });
                    } catch {
                        // Skip non-JSON objects (e.g. audio cache)
                        documents.push({ _key: obj.key, _binary: true, _size: obj.size });
                    }
                }
            }

            totalFetched += batch.objects.length;
            cursor = batch.truncated ? batch.cursor : undefined;
        } while (cursor && totalFetched < limit);

        return Response.json({
            prefix,
            count: documents.length,
            truncated: totalFetched >= limit,
            documents,
        });
    } catch (err) {
        return Response.json(
            { error: 'Export failed', message: String(err) },
            { status: 500 },
        );
    }
}
