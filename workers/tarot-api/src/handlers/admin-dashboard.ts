import type { Env } from '../env.js';
import type { DailySummary } from '@shared/contracts/entity-contracts.js';
import { buildLocationKey, loadJson, requireAdmin } from './admin-helpers.js';
import { listWithMetadata, type ListedEntity } from '../services/r2-adapter.js';
import {
    parseGameMeta,
    parseTurnMeta,
    parseUserMeta,
    type GameSummary,
    type TurnSummary,
    type UserSummary,
} from '../services/entity-metadata.js';
import { WORKER_CONFIG } from '../config.js';

const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Dashboard data response.
 *
 * v2.4.4: sessions removed as a first-class concept (their per-row info is
 * derived from games where useful). Readings are the new primary entity.
 *
 * The aggregation reads every entity's customMetadata via list() (one
 * subrequest per 1000 objects) instead of GETting bodies, keeping a cold
 * dashboard well under Cloudflare's 1000-subrequest/invocation cap.
 */
export interface DashboardResponse {
    period: { from: string; to: string };
    scopeDays: number;
    totals: {
        users: { total: number; scope: number };
        readings: { total: number; scope: number };
        followUps: { total: number; scope: number };
    };
    daily: DailySummary[];
    topLanguages: Array<{ language: string; count: number }>;
    users: Array<{
        uid: string;
        name: string | null;
        alias: string | null;
        language: string;
        tone: string;
        totalReadings: number;
        totalFollowUps: number;
        readingsInPeriod: number;
        questionsInPeriod: number;
        followUpsInPeriod: number;
        lastSeenAt: string;
        lastCity: string | null;
        lastCountry: string | null;
        userTraits: Record<string, string[]>;
        recentGameIds: string[];
    }>;
    readings: Array<{
        gameId: string;
        uid: string;
        userName: string | null;
        userAlias: string | null;
        sessionId: string;
        spreadType: number;
        question: string | null;
        topic: string | null;
        language: string;
        tone: string;
        turnCount: number;
        followUpCount: number;
        city: string | null;
        country: string | null;
        createdAt: string;
    }>;
    locations: Array<{
        key: string;
        city: string | null;
        country: string | null;
        gameCount: number;
        userCount: number;
        lastPlayedAt: string;
        sampleGameIds: string[];
        sampleUserIds: string[];
    }>;
    performance: {
        avgResponseMs: number;
        totalTurns: number;
        providerBreakdown: Record<string, number>;
    };
    activeUsersToday: number;
    schemaVersion: string;
    workerVersion: string;
}

/**
 * GET /api/admin/dashboard?days=1|3|7|30[&force=1]
 * Protected by ANALYTICS_KEY. Responses cached in R2 for 5 minutes (per worker
 * version). `force=1` bypasses the cache.
 */
export async function handleDashboard(request: Request, env: Env): Promise<Response> {
    const unauthorized = requireAdmin(request, env);
    if (unauthorized) return unauthorized;

    const url = new URL(request.url);
    const requestedDays = parseInt(url.searchParams.get('days') ?? '7', 10);
    const days = [1, 3, 7, 30].includes(requestedDays) ? requestedDays : 7;
    const force = url.searchParams.get('force') === '1';

    // Cache key is version-scoped so each release starts fresh (a previous
    // release's shape is never served by a newer worker).
    const cacheKey = `cache/dashboard/${WORKER_CONFIG.version}/days-${days}.json`;
    if (!force) {
        try {
            const cached = await loadJson<DashboardResponse & { cachedAt?: string }>(env.R2, cacheKey);
            if (cached?.cachedAt) {
                const age = Date.now() - new Date(cached.cachedAt).getTime();
                if (age < CACHE_TTL_MS) return Response.json(cached);
            }
        } catch { /* fall through and recompute */ }
    }

    try {
        // ── 1. Window ──────────────────────────────────────────────
        const today = new Date();
        const dates: string[] = [];
        for (let i = 0; i < days; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            dates.push(d.toISOString().slice(0, 10));
        }
        const scopeStart = dates[dates.length - 1];
        const isWithinScope = (iso: string | null | undefined) =>
            Boolean(iso && iso.slice(0, 10) >= scopeStart);

        // ── 2. Cheap inputs (no per-object GETs) ───────────────────
        const [
            userEntities,
            gameEntities,
            turnEntities,
            dailyResults,
            activeUsersToday,
        ] = await Promise.all([
            listWithMetadata(env.R2, 'entities/users/'),
            listWithMetadata(env.R2, 'entities/games/'),
            listWithMetadata(env.R2, 'entities/turns/'),
            Promise.all(dates.map(d => loadJson<DailySummary>(env.R2, `analytics/daily/${d}.json`))),
            (async () => {
                const obj = await env.R2.get(`indexes/active-users/${dates[0]}.json`);
                if (!obj) return 0;
                try {
                    const data = await obj.json() as string[] | { uids?: string[] };
                    return Array.isArray(data) ? data.length : (data.uids?.length ?? 0);
                } catch { return 0; }
            })(),
        ]);
        const daily = dailyResults.filter((d): d is DailySummary => d !== null);

        // ── 3. Parse metadata once into typed summaries ────────────
        const allUsers: UserSummary[] = userEntities
            .map((e: ListedEntity) => parseUserMeta(e.meta))
            .filter((u): u is UserSummary => u !== null);
        const allGames: GameSummary[] = gameEntities
            .map((e: ListedEntity) => parseGameMeta(e.meta))
            .filter((g): g is GameSummary => g !== null);
        const allTurns: TurnSummary[] = turnEntities
            .map((e: ListedEntity) => parseTurnMeta(e.meta))
            .filter((t): t is TurnSummary => t !== null);

        const userByUid = new Map(allUsers.map(u => [u.uid, u]));

        // ── 4. Scoped slices ───────────────────────────────────────
        const scopedGames = allGames.filter(g => isWithinScope(g.createdAt));
        const scopedUsers = allUsers.filter(u => isWithinScope(u.lastSeenAt));
        const scopedReadingTurns = allTurns.filter(t => t.turnType === 'reading' && isWithinScope(t.createdAt));
        const scopedFollowUpTurns = allTurns.filter(t => t.turnType === 'followup' && isWithinScope(t.createdAt));

        // ── 5. Follow-up counts by game/user ───────────────────────
        const followUpsByGameId = new Map<string, number>();
        const followUpsByUid = new Map<string, number>();
        for (const t of scopedFollowUpTurns) {
            followUpsByGameId.set(t.gameId, (followUpsByGameId.get(t.gameId) ?? 0) + 1);
            followUpsByUid.set(t.uid, (followUpsByUid.get(t.uid) ?? 0) + 1);
        }

        // ── 6. Performance from turn metadata (restored from v2.4.3) ─
        const providerBreakdown: Record<string, number> = {};
        let totalReadingMs = 0;
        for (const t of scopedReadingTurns) {
            if (t.responseTimeMs > 0) totalReadingMs += t.responseTimeMs;
            if (t.aiProvider) providerBreakdown[t.aiProvider] = (providerBreakdown[t.aiProvider] ?? 0) + 1;
        }
        const performance = {
            avgResponseMs: scopedReadingTurns.length > 0
                ? Math.round(totalReadingMs / scopedReadingTurns.length)
                : 0,
            totalTurns: scopedReadingTurns.length,
            providerBreakdown,
        };

        // ── 7. Totals (sessions are gone) ──────────────────────────
        const totals = {
            users: {
                total: allUsers.length,
                scope: allUsers.filter(u => isWithinScope(u.firstSeenAt)).length,
            },
            readings: {
                total: allGames.length,
                scope: scopedGames.length,
            },
            followUps: {
                total: allTurns.filter(t => t.turnType === 'followup').length,
                scope: scopedFollowUpTurns.length,
            },
        };

        // ── 8. Top languages from daily summaries ──────────────────
        const langMap: Record<string, number> = {};
        for (const d of daily) {
            for (const l of (d.topLanguages ?? [])) {
                langMap[l.language] = (langMap[l.language] ?? 0) + l.count;
            }
        }
        const topLanguages = Object.entries(langMap)
            .map(([language, count]) => ({ language, count }))
            .sort((a, b) => b.count - a.count);

        // ── 9. Users table — readings/questions/follow-ups in period ─
        const gamesByUid = new Map<string, GameSummary[]>();
        for (const g of scopedGames) {
            const arr = gamesByUid.get(g.uid) ?? [];
            arr.push(g);
            gamesByUid.set(g.uid, arr);
        }
        const usersTable = scopedUsers
            .map(u => {
                const userGames = (gamesByUid.get(u.uid) ?? [])
                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
                return {
                    uid: u.uid,
                    name: u.name,
                    alias: u.adminAlias,
                    language: u.language,
                    tone: u.tone,
                    totalReadings: u.totalReadings,
                    totalFollowUps: u.totalFollowUps,
                    readingsInPeriod: userGames.length,
                    questionsInPeriod: userGames.filter(g => !!g.question).length,
                    followUpsInPeriod: followUpsByUid.get(u.uid) ?? 0,
                    lastSeenAt: u.lastSeenAt,
                    lastCity: u.lastCity,
                    lastCountry: u.lastCountry,
                    userTraits: {}, // lazy-loaded by /api/admin/user/{uid}
                    recentGameIds: userGames.slice(0, 5).map(g => g.gameId),
                };
            })
            .filter(u => u.readingsInPeriod > 0)
            .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));

        // ── 10. Readings table — first-class, replaces "sessions" ──
        const readingsTable = scopedGames
            .slice()
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map(g => {
                const u = userByUid.get(g.uid);
                return {
                    gameId: g.gameId,
                    uid: g.uid,
                    userName: u?.name ?? null,
                    userAlias: u?.adminAlias ?? null,
                    sessionId: g.sessionId,
                    spreadType: g.spreadType,
                    question: g.question,
                    topic: g.topic,
                    language: g.language,
                    tone: g.tone,
                    turnCount: g.turnCount,
                    followUpCount: followUpsByGameId.get(g.gameId) ?? 0,
                    city: g.city,
                    country: g.country,
                    createdAt: g.createdAt,
                };
            });

        // ── 11. Locations from scoped games only ───────────────────
        const locationMap = new Map<string, DashboardResponse['locations'][number]>();
        for (const g of scopedGames) {
            if (!g.city && !g.country) continue;
            const key = buildLocationKey(g.city, g.country);
            const current = locationMap.get(key) ?? {
                key, city: g.city, country: g.country,
                gameCount: 0, userCount: 0,
                lastPlayedAt: g.createdAt,
                sampleGameIds: [], sampleUserIds: [],
            };
            current.gameCount += 1;
            if (g.createdAt > current.lastPlayedAt) current.lastPlayedAt = g.createdAt;
            if (current.sampleGameIds.length < 5 && !current.sampleGameIds.includes(g.gameId)) {
                current.sampleGameIds.push(g.gameId);
            }
            if (!current.sampleUserIds.includes(g.uid)) {
                current.sampleUserIds.push(g.uid);
                current.userCount = current.sampleUserIds.length;
            }
            locationMap.set(key, current);
        }
        const locations = Array.from(locationMap.values())
            .map(l => ({ ...l, sampleUserIds: l.sampleUserIds.slice(0, 5) }))
            .sort((a, b) => b.lastPlayedAt.localeCompare(a.lastPlayedAt));

        // ── 12. Build response, cache, return ──────────────────────
        const response: DashboardResponse = {
            period: { from: dates[dates.length - 1], to: dates[0] },
            scopeDays: days,
            totals,
            daily: daily.sort((a, b) => a.date.localeCompare(b.date)),
            topLanguages,
            users: usersTable,
            readings: readingsTable,
            locations,
            performance,
            activeUsersToday,
            schemaVersion: WORKER_CONFIG.schemaVersion,
            workerVersion: WORKER_CONFIG.version,
        };

        try {
            await env.R2.put(
                cacheKey,
                JSON.stringify({ ...response, cachedAt: new Date().toISOString() }),
                { httpMetadata: { contentType: 'application/json' } },
            );
        } catch (cacheErr) {
            console.warn('Dashboard cache write failed:', cacheErr instanceof Error ? cacheErr.message : cacheErr);
        }

        return Response.json(response);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('Dashboard error:', message);
        return Response.json({ error: 'Dashboard failed', message }, { status: 500 });
    }
}
