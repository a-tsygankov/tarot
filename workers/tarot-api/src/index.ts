import type { Env } from './env.js';
import { handleReading } from './handlers/reading.js';
import { handleFollowUp } from './handlers/followup.js';
import { handleTts } from './handlers/tts.js';
import { handleSession } from './handlers/session.js';
import { handleEvent } from './handlers/event.js';
import { handleVersion } from './handlers/version.js';
import { handleExport } from './handlers/admin-export.js';
import {
    handleSchemaActivate,
    handleSchemaRollback,
    handleSchemaMigrate,
    handleReindex,
} from './handlers/admin-migrate.js';
import { R2SchemaRepository } from './repositories/schema-repository.js';
import { SchemaService } from './services/schema-service.js';
import { R2UserRepository } from './repositories/user-repository.js';
import { R2GameRepository } from './repositories/game-repository.js';
import { R2AnalyticsRepository } from './repositories/analytics-repository.js';
import { IndexWriter } from './services/index-writer.js';
import { checkRateLimit, rateLimitResponse } from './middleware/rate-limiter.js';
import { WORKER_CONFIG } from './config.js';

/**
 * Tarot API — Cloudflare Worker entry point.
 * Routes requests to handlers with CORS support and rate limiting.
 */
export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return corsResponse(env, new Response(null, { status: 204 }));
        }

        const url = new URL(request.url);
        const path = url.pathname;

        // Origin check
        if (!isAllowedOrigin(request, env)) {
            return new Response('Forbidden', { status: 403 });
        }

        // Ensure schema is initialized (cheap no-op after first call)
        const schemaRepo = new R2SchemaRepository(env.R2);
        const schemaService = new SchemaService(schemaRepo);

        // Compose dependencies
        const users = new R2UserRepository(env.R2);
        const games = new R2GameRepository(env.R2);
        const analytics = new R2AnalyticsRepository(env.R2);
        const indexWriter = new IndexWriter(env.R2);
        const deps = { users, games, analytics, indexWriter };

        let response: Response;

        // Rate limiting for reading/followup endpoints
        const clientIp = request.headers.get('CF-Connecting-IP') ?? 'unknown';
        if (path === '/api/reading' || path === '/api/followup') {
            const rl = checkRateLimit(`reading:${clientIp}`, {
                maxRequests: WORKER_CONFIG.rateLimit.readingsPerHour,
                windowMs: 3_600_000,
            });
            if (!rl.allowed) return corsResponse(env, rateLimitResponse(rl));
        }
        if (path === '/api/event') {
            const rl = checkRateLimit(`event:${clientIp}`, {
                maxRequests: WORKER_CONFIG.rateLimit.eventsPerMinute,
                windowMs: 60_000,
            });
            if (!rl.allowed) return corsResponse(env, rateLimitResponse(rl));
        }

        try {
            // Route matching
            if (path === '/api/reading' && request.method === 'POST') {
                response = await handleReading(request, env, deps);
            } else if (path === '/api/followup' && request.method === 'POST') {
                response = await handleFollowUp(request, env, deps);
            } else if (path === '/api/tts' && request.method === 'POST') {
                response = await handleTts(request, env);
            } else if (path === '/api/session' && request.method === 'POST') {
                response = await handleSession(request, env, deps);
            } else if (path === '/api/event' && request.method === 'POST') {
                response = await handleEvent(request, env);
            } else if (path === '/api/meta/version' && request.method === 'GET') {
                response = await handleVersion(request, env);
            } else if (path === '/api/health' && request.method === 'GET') {
                response = Response.json({ status: 'ok' });
            // ── Admin routes (X-Admin-Key protected) ──
            } else if (path === '/api/admin/export' && request.method === 'GET') {
                response = await handleExport(request, env);
            } else if (path === '/api/admin/schema/activate' && request.method === 'POST') {
                response = await handleSchemaActivate(request, env);
            } else if (path === '/api/admin/schema/rollback' && request.method === 'POST') {
                response = await handleSchemaRollback(request, env);
            } else if (path === '/api/admin/schema/migrate' && request.method === 'POST') {
                response = await handleSchemaMigrate(request, env);
            } else if (path === '/api/admin/reindex' && request.method === 'POST') {
                response = await handleReindex(request, env);
            } else if (path === '/api/admin/schema/status' && request.method === 'GET') {
                const active = await schemaService.ensureInitialized();
                const manifest = await schemaRepo.getLatestManifest();
                response = Response.json({ active, latestManifest: manifest });
            } else {
                response = Response.json(
                    { error: 'Not found', path },
                    { status: 404 },
                );
            }
        } catch (err) {
            console.error('Unhandled error:', err);
            response = Response.json(
                { error: 'Internal server error' },
                { status: 500 },
            );
        }

        return corsResponse(env, response);
    },
} satisfies ExportedHandler<Env>;

// ── CORS helpers ────────────────────────────────────────────────────

function corsResponse(env: Env, response: Response): Response {
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', env.ALLOWED_ORIGINS);
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
    headers.set('Access-Control-Max-Age', '86400');

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

function isAllowedOrigin(request: Request, env: Env): boolean {
    const url = new URL(request.url);
    if (url.pathname === '/api/health' || url.pathname === '/api/meta/version') {
        return true;
    }

    const origin = request.headers.get('Origin');
    if (!origin) return true; // Non-browser requests

    const allowed = env.ALLOWED_ORIGINS.split(',').map(s => s.trim());
    return allowed.includes(origin);
}
