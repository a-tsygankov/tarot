import type { Env } from '../env.js';
import type { SessionRequest } from '@shared/contracts/api-contracts.js';
import { WORKER_CONFIG } from '../config.js';
import type { R2UserRepository } from '../repositories/user-repository.js';
import type { R2AnalyticsRepository } from '../repositories/analytics-repository.js';
import type { IndexWriter } from '../services/index-writer.js';
import { r2PutJson } from '../services/r2-adapter.js';

export interface SessionDeps {
    users: R2UserRepository;
    analytics: R2AnalyticsRepository;
    indexWriter: IndexWriter;
}

/**
 * POST /api/session — log session start, upsert user document.
 */
export async function handleSession(request: Request, env: Env, deps: SessionDeps): Promise<Response> {
    try {
        const body = await request.json() as SessionRequest;
        const now = new Date().toISOString();
        const date = now.slice(0, 10);

        // Extract geo from Cloudflare headers
        const country = request.headers.get('cf-ipcountry') ?? null;
        const city = (request as any).cf?.city ?? null;

        // Write session document
        const sessionDoc = {
            type: 'session',
            schemaVersion: WORKER_CONFIG.schemaVersion,
            sessionId: body.sessionId,
            uid: body.uid,
            createdAt: now,
            country,
            city,
            timezone: (request as any).cf?.timezone ?? null,
            device: body.device ?? null,
            userAgent: request.headers.get('user-agent'),
            appVersion: body.appVersion,
            screenWidth: body.screenWidth ?? null,
            screenHeight: body.screenHeight ?? null,
        };

        await r2PutJson(env.R2, `entities/sessions/${body.sessionId}.json`, sessionDoc);

        // Upsert user via repository
        await deps.users.upsert(body.uid, { country, city });

        // Analytics (best-effort)
        deps.analytics.incrementDaily(date, { sessions: 1, uniqueUsers: 1 }).catch(() => {});
        deps.indexWriter.trackActiveUser(date, body.uid).catch(() => {});

        return Response.json({ ok: true });
    } catch (err) {
        console.error('Session handler error:', err);
        return Response.json({ ok: false }, { status: 500 });
    }
}
