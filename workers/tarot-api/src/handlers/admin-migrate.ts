import type { Env } from '../env.js';
import type { BaseDocument, GameDocument, SchemaVersionDescriptor, SessionDocument, TurnDocument, UserDocument } from '@shared/contracts/entity-contracts.js';
import { R2SchemaRepository } from '../repositories/schema-repository.js';
import { SchemaService } from '../services/schema-service.js';
import {
    buildGameMetadata,
    buildSessionMetadata,
    buildTurnMetadata,
    buildUserMetadata,
} from '../services/entity-metadata.js';

/**
 * POST /api/admin/schema/activate — activate a new schema version.
 * Body: SchemaVersionDescriptor
 */
export async function handleSchemaActivate(request: Request, env: Env): Promise<Response> {
    if (!checkAdminAuth(request, env)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const descriptor = await request.json() as SchemaVersionDescriptor;
        const repo = new R2SchemaRepository(env.R2);
        const service = new SchemaService(repo);

        const active = await service.activate(descriptor.version, descriptor);
        return Response.json({ ok: true, active });
    } catch (err) {
        return Response.json(
            { error: 'Activation failed', message: String(err) },
            { status: 500 },
        );
    }
}

/**
 * POST /api/admin/schema/rollback — rollback to previous version.
 */
export async function handleSchemaRollback(request: Request, env: Env): Promise<Response> {
    if (!checkAdminAuth(request, env)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const repo = new R2SchemaRepository(env.R2);
        const service = new SchemaService(repo);
        const rolled = await service.rollback();

        if (!rolled) {
            return Response.json(
                { error: 'No previous version to rollback to' },
                { status: 400 },
            );
        }
        return Response.json({ ok: true, active: rolled });
    } catch (err) {
        return Response.json(
            { error: 'Rollback failed', message: String(err) },
            { status: 500 },
        );
    }
}

/**
 * POST /api/admin/schema/migrate — batch migrate documents under a prefix.
 * Body: { prefix: string }
 * Applies lazy migration to all documents, re-writes them to R2.
 */
export async function handleSchemaMigrate(request: Request, env: Env): Promise<Response> {
    if (!checkAdminAuth(request, env)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { prefix } = await request.json() as { prefix: string };
        if (!prefix) {
            return Response.json({ error: 'Missing prefix' }, { status: 400 });
        }

        const repo = new R2SchemaRepository(env.R2);
        const service = new SchemaService(repo);
        const currentVersion = await service.getCurrentVersion();

        // List all objects under prefix
        const keys: string[] = [];
        let cursor: string | undefined;
        do {
            const batch = await env.R2.list({ prefix, cursor, limit: 1000 });
            keys.push(...batch.objects.map(o => o.key));
            cursor = batch.truncated ? batch.cursor : undefined;
        } while (cursor);

        const manifest = await service.createManifest('mixed', currentVersion, keys.length);

        let processed = 0;
        let failed = 0;
        const errors: Array<{ key: string; error: string }> = [];

        for (const key of keys) {
            try {
                const obj = await env.R2.get(key);
                if (!obj) { processed++; continue; }

                let doc: BaseDocument;
                try {
                    doc = await obj.json() as BaseDocument;
                } catch {
                    processed++; // Skip non-JSON (audio cache etc.)
                    continue;
                }

                if (!doc.schemaVersion || doc.schemaVersion === currentVersion) {
                    processed++;
                    continue;
                }

                const migrated = await service.lazyMigrate(doc);
                await env.R2.put(key, JSON.stringify(migrated));
                processed++;
            } catch (err) {
                failed++;
                errors.push({ key, error: String(err) });
            }
        }

        await service.updateManifestProgress(manifest, processed, failed, errors);

        return Response.json({
            ok: true,
            manifestId: manifest.manifestId,
            total: keys.length,
            processed,
            failed,
            errors: errors.slice(0, 20), // Only first 20 in response
        });
    } catch (err) {
        return Response.json(
            { error: 'Migration failed', message: String(err) },
            { status: 500 },
        );
    }
}

/**
 * POST /api/admin/reindex — rebuild materialized indexes from entity data.
 * Body: { type: "user-games" | "date-games" | "active-users" }
 */
export async function handleReindex(request: Request, env: Env): Promise<Response> {
    if (!checkAdminAuth(request, env)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json() as { type: string; prefix?: string };
        const { type, prefix } = body;

        if (type === 'user-games') {
            return await reindexUserGames(env.R2);
        } else if (type === 'date-games') {
            return await reindexDateGames(env.R2);
        } else if (type === 'active-users') {
            return await reindexActiveUsers(env.R2);
        } else if (type === 'date-sessions') {
            return await reindexDateSessions(env.R2);
        } else if (type === 'metadata') {
            return await backfillMetadata(env.R2, prefix);
        }

        return Response.json({ error: `Unknown index type: ${type}` }, { status: 400 });
    } catch (err) {
        return Response.json(
            { error: 'Reindex failed', message: String(err) },
            { status: 500 },
        );
    }
}

// ── Reindex implementations ─────────────────────────────────────────

async function reindexUserGames(r2: R2Bucket): Promise<Response> {
    const index = new Map<string, Array<{ id: string; createdAt: string }>>();

    let cursor: string | undefined;
    do {
        const batch = await r2.list({ prefix: 'entities/games/', cursor, limit: 1000 });
        for (const obj of batch.objects) {
            const data = await r2.get(obj.key);
            if (!data) continue;
            const game = await data.json() as { uid: string; gameId: string; createdAt: string };
            if (!index.has(game.uid)) index.set(game.uid, []);
            index.get(game.uid)!.push({ id: game.gameId, createdAt: game.createdAt });
        }
        cursor = batch.truncated ? batch.cursor : undefined;
    } while (cursor);

    let written = 0;
    for (const [uid, entries] of index) {
        await r2.put(`indexes/user-games/${uid}.json`, JSON.stringify(entries));
        written++;
    }

    return Response.json({ ok: true, type: 'user-games', usersIndexed: written });
}

async function reindexDateGames(r2: R2Bucket): Promise<Response> {
    const index = new Map<string, Array<{ id: string; createdAt: string }>>();

    let cursor: string | undefined;
    do {
        const batch = await r2.list({ prefix: 'entities/games/', cursor, limit: 1000 });
        for (const obj of batch.objects) {
            const data = await r2.get(obj.key);
            if (!data) continue;
            const game = await data.json() as { gameId: string; createdAt: string };
            const date = game.createdAt.slice(0, 10);
            if (!index.has(date)) index.set(date, []);
            index.get(date)!.push({ id: game.gameId, createdAt: game.createdAt });
        }
        cursor = batch.truncated ? batch.cursor : undefined;
    } while (cursor);

    let written = 0;
    for (const [date, entries] of index) {
        await r2.put(`indexes/date-games/${date}.json`, JSON.stringify(entries));
        written++;
    }

    return Response.json({ ok: true, type: 'date-games', datesIndexed: written });
}

async function reindexActiveUsers(r2: R2Bucket): Promise<Response> {
    const index = new Map<string, Set<string>>();

    let cursor: string | undefined;
    do {
        const batch = await r2.list({ prefix: 'entities/sessions/', cursor, limit: 1000 });
        for (const obj of batch.objects) {
            const data = await r2.get(obj.key);
            if (!data) continue;
            const session = await data.json() as { uid: string; createdAt: string };
            const date = session.createdAt.slice(0, 10);
            if (!index.has(date)) index.set(date, new Set());
            index.get(date)!.add(session.uid);
        }
        cursor = batch.truncated ? batch.cursor : undefined;
    } while (cursor);

    let written = 0;
    for (const [date, uids] of index) {
        await r2.put(`indexes/active-users/${date}.json`, JSON.stringify([...uids]));
        written++;
    }

    return Response.json({ ok: true, type: 'active-users', datesIndexed: written });
}

async function reindexDateSessions(r2: R2Bucket): Promise<Response> {
    const index = new Map<string, Array<{ id: string; createdAt: string }>>();

    let cursor: string | undefined;
    do {
        const batch = await r2.list({ prefix: 'entities/sessions/', cursor, limit: 1000 });
        for (const obj of batch.objects) {
            const data = await r2.get(obj.key);
            if (!data) continue;
            const session = await data.json() as { sessionId: string; createdAt: string };
            const date = session.createdAt.slice(0, 10);
            if (!index.has(date)) index.set(date, []);
            index.get(date)!.push({ id: session.sessionId, createdAt: session.createdAt });
        }
        cursor = batch.truncated ? batch.cursor : undefined;
    } while (cursor);

    let written = 0;
    for (const [date, entries] of index) {
        await r2.put(`indexes/date-sessions/${date}.json`, JSON.stringify(entries));
        written++;
    }

    return Response.json({ ok: true, type: 'date-sessions', datesIndexed: written });
}

// ── Auth helper ─────────────────────────────────────────────────────

function checkAdminAuth(request: Request, env: Env): boolean {
    return request.headers.get('X-Admin-Key') === env.ANALYTICS_KEY;
}

// ── Metadata backfill ────────────────────────────────────────────────
//
// Rewrites every entity under a single prefix with the customMetadata that
// the dashboard now reads via list(). One prefix per call so the subrequest
// total (~2 per object: list + GET + PUT amortized) fits under Cloudflare's
// 1000/invocation limit for our current data volumes. Idempotent: objects
// whose metadata already has `metaV === '1'` are skipped.
//
// Operator workflow after deploying v2.4.4:
//   POST /api/admin/reindex {type:"metadata", prefix:"entities/users/"}
//   POST /api/admin/reindex {type:"metadata", prefix:"entities/sessions/"}
//   POST /api/admin/reindex {type:"metadata", prefix:"entities/games/"}
//   POST /api/admin/reindex {type:"metadata", prefix:"entities/turns/"}

type MetaBuilder = (doc: unknown) => Record<string, string>;

const META_BUILDERS: Record<string, MetaBuilder> = {
    'entities/users/':    (doc) => buildUserMetadata(doc as UserDocument),
    'entities/sessions/': (doc) => buildSessionMetadata(doc as SessionDocument),
    'entities/games/':    (doc) => buildGameMetadata(doc as GameDocument),
    'entities/turns/':    (doc) => buildTurnMetadata(doc as TurnDocument),
};

async function backfillMetadata(r2: R2Bucket, prefix?: string): Promise<Response> {
    if (!prefix || !(prefix in META_BUILDERS)) {
        return Response.json(
            { error: `prefix must be one of: ${Object.keys(META_BUILDERS).join(', ')}` },
            { status: 400 },
        );
    }
    const build = META_BUILDERS[prefix];

    let scanned = 0;
    let written = 0;
    let skipped = 0;
    const errors: Array<{ key: string; error: string }> = [];
    let cursor: string | undefined;

    do {
        const opts = { prefix, cursor, limit: 1000, include: ['customMetadata'] } as unknown as R2ListOptions;
        const batch = await r2.list(opts);
        for (const obj of batch.objects) {
            scanned++;
            if (obj.customMetadata?.metaV === '1') {
                skipped++;
                continue;
            }
            try {
                const got = await r2.get(obj.key);
                if (!got) continue;
                const doc = await got.json();
                await r2.put(obj.key, JSON.stringify(doc), {
                    httpMetadata: { contentType: 'application/json' },
                    customMetadata: build(doc),
                });
                written++;
            } catch (err) {
                errors.push({ key: obj.key, error: err instanceof Error ? err.message : String(err) });
            }
        }
        cursor = batch.truncated ? batch.cursor : undefined;
    } while (cursor);

    return Response.json({
        ok: true,
        type: 'metadata',
        prefix,
        scanned,
        written,
        skipped,
        errors: errors.slice(0, 20),
    });
}
