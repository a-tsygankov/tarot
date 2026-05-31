import type { Env } from '../env.js';
import type { DailySummary, GameDocument, SessionDocument, TurnDocument, UserDocument } from '@shared/contracts/entity-contracts.js';
import type { TraitValueMap } from '@shared/contracts/api-contracts.js';
import { buildLocationKey, listDocuments, loadJson, requireAdmin } from './admin-helpers.js';
import { WORKER_CONFIG } from '../config.js';

const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Dashboard data response.
 * Aggregated from R2 analytics, user index, and recent game data.
 */
export interface DashboardResponse {
    period: { from: string; to: string };
    scopeDays: number;
    totals: {
        users: { total: number; scope: number };
        readings: { total: number; scope: number };
        followUps: { total: number; scope: number };
        sessions: { total: number; scope: number };
    };
    daily: DailySummary[];
    topLanguages: Array<{ language: string; count: number }>;
    recentGames: Array<{
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
        city: string | null;
        country: string | null;
        createdAt: string;
    }>;
    users: Array<{
        uid: string;
        name: string | null;
        alias: string | null;
        gender: string | null;
        birthdate: string | null;
        language: string;
        tone: string;
        latestDevice: string | null;
        totalReadings: number;
        totalFollowUps: number;
        readingsInPeriod: number;
        questionsInPeriod: number;
        followUpsInPeriod: number;
        lastSeenAt: string;
        lastCity: string | null;
        lastCountry: string | null;
        userTraits: Record<string, string[]>;
        sessionIds: string[];
        locationKeys: string[];
        recentGameIds: string[];
    }>;
    sessions: Array<{
        sessionId: string;
        uid: string;
        userName: string | null;
        userAlias: string | null;
        createdAt: string;
        city: string | null;
        country: string | null;
        timezone: string | null;
        device: string | null;
        appVersion: string;
        gameCount: number;
        questionCount: number;
        followUpCount: number;
        lastGameId: string | null;
    }>;
    locations: Array<{
        key: string;
        city: string | null;
        country: string | null;
        sessionCount: number;
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
 * GET /api/admin/dashboard?days=1|7|30
 * Returns aggregated analytics for the dashboard.
 * Protected by ANALYTICS_KEY.
 */
export async function handleDashboard(request: Request, env: Env): Promise<Response> {
    const unauthorized = requireAdmin(request, env);
    if (unauthorized) {
        return unauthorized;
    }

    const url = new URL(request.url);
    const requestedDays = parseInt(url.searchParams.get('days') ?? '7', 10);
    const days = [1, 3, 7, 30].includes(requestedDays) ? requestedDays : 7;
    const force = url.searchParams.get('force') === '1';

    // Cache key is version-scoped so that releases never serve a stale shape
    // (e.g., v2.4.1 cached empty-scope responses; v2.4.2 must not return them).
    const cacheKey = `cache/dashboard/${WORKER_CONFIG.version}/days-${days}.json`;
    if (!force) {
        try {
            const cached = await loadJson<DashboardResponse & { cachedAt?: string }>(env.R2, cacheKey);
            if (cached?.cachedAt) {
                const age = Date.now() - new Date(cached.cachedAt).getTime();
                if (age < CACHE_TTL_MS) {
                    return Response.json(cached);
                }
            }
        } catch { /* fall through to recompute */ }
    }

    try {
        const today = new Date();
        const dates: string[] = [];
        for (let i = 0; i < days; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            dates.push(d.toISOString().slice(0, 10));
        }

        // Daily summaries (already aggregated server-side) — cheap reads.
        const dailyPromises = dates.map(async (date) =>
            loadJson<DailySummary>(env.R2, `analytics/daily/${date}.json`),
        );

        // Active users for today (legacy {uids} shape tolerated).
        const activeUsersPromise = (async () => {
            const obj = await env.R2.get(`indexes/active-users/${dates[0]}.json`);
            if (!obj) return 0;
            try {
                const data = await obj.json() as string[] | { uids?: string[] };
                return Array.isArray(data) ? data.length : (data.uids?.length ?? 0);
            } catch {
                return 0;
            }
        })();

        // Cold-path full-table scan. Turn docs and user-traits docs are deliberately
        // skipped here — they push us past Cloudflare's 1000-subrequest/invocation
        // limit (users + sessions + games + turns + traits ≈ 1000 GETs at current
        // volume). Per-turn metrics (avgResponseMs, providerBreakdown, per-user
        // scoped follow-up counts) degrade to 0/empty; user-traits are lazy-loaded
        // by the per-user detail endpoint. Top-level follow-up totals come from
        // user.stats.totalFollowUps and daily summaries instead.
        const [allUsers, allSessions, allGames] = await Promise.all([
            listDocuments<UserDocument>(env.R2, 'entities/users/'),
            listDocuments<SessionDocument>(env.R2, 'entities/sessions/'),
            listDocuments<GameDocument>(env.R2, 'entities/games/'),
        ]);

        const userNameByUid = new Map<string, string | null>();
        const userAliasByUid = new Map<string, string | null>();
        for (const user of allUsers) {
            userNameByUid.set(user.uid, user.name);
            userAliasByUid.set(user.uid, user.adminAlias ?? null);
        }

        const [dailyResults, activeUsersToday] = await Promise.all([
            Promise.all(dailyPromises),
            activeUsersPromise,
        ]);
        const daily = dailyResults.filter((d): d is DailySummary => d !== null);
        const scopeStart = dates[dates.length - 1];
        const isWithinScope = (iso: string | null | undefined) => Boolean(iso && iso.slice(0, 10) >= scopeStart);

        // Per-turn data is no longer scanned (see comment above). These remain
        // empty placeholders so the downstream aggregation shape is unchanged.
        const scopedReadingTurns: TurnDocument[] = [];
        const scopedFollowUpTurns: TurnDocument[] = [];

        // Total/scope follow-up counts come from user docs and daily summaries
        // since we no longer scan turn docs.
        const totalFollowUpsAllTime = allUsers.reduce((sum, u) => sum + (u.stats?.totalFollowUps ?? 0), 0);
        const scopedFollowUpsFromDaily = daily.reduce((sum, d) => sum + (d.followUps ?? 0), 0);

        // Recent games — last 20 most recent overall (not scope-limited so the panel
        // is never empty when a small scope window has no activity).
        const recentGames: DashboardResponse['recentGames'] = allGames
            .slice()
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, 20)
            .map(g => ({
                gameId: g.gameId,
                uid: g.uid,
                userName: userNameByUid.get(g.uid) ?? null,
                userAlias: userAliasByUid.get(g.uid) ?? null,
                sessionId: g.sessionId,
                spreadType: g.spreadType,
                question: g.question,
                topic: g.topic,
                language: g.language,
                tone: g.tone,
                turnCount: g.turnCount,
                city: g.location?.city ?? null,
                country: g.location?.country ?? null,
                createdAt: g.createdAt,
            }));

        // Follow-up turns within the period, aggregated by user and by session.
        const sessionIdByGameId = new Map<string, string>();
        for (const game of allGames) {
            sessionIdByGameId.set(game.gameId, game.sessionId);
        }
        const followUpsByUid = new Map<string, number>();
        const followUpsBySession = new Map<string, number>();
        for (const turn of scopedFollowUpTurns) {
            followUpsByUid.set(turn.uid, (followUpsByUid.get(turn.uid) ?? 0) + 1);
            const sid = sessionIdByGameId.get(turn.gameId);
            if (sid) {
                followUpsBySession.set(sid, (followUpsBySession.get(sid) ?? 0) + 1);
            }
        }
        const providerBreakdown: Record<string, number> = {};
        let totalReadingMs = 0;
        for (const turn of scopedReadingTurns) {
            if (turn.responseTimeMs > 0) {
                totalReadingMs += turn.responseTimeMs;
            }
            if (turn.aiProvider) {
                providerBreakdown[turn.aiProvider] = (providerBreakdown[turn.aiProvider] ?? 0) + 1;
            }
        }
        const performance = {
            avgResponseMs: scopedReadingTurns.length > 0 ? Math.round(totalReadingMs / scopedReadingTurns.length) : 0,
            totalTurns: scopedReadingTurns.length,
            providerBreakdown,
        };

        const totals = {
            users: {
                total: allUsers.length,
                scope: allUsers.filter(user => isWithinScope(user.firstSeenAt)).length,
            },
            readings: {
                total: allGames.length,
                scope: allGames.filter(game => isWithinScope(game.createdAt)).length,
            },
            followUps: {
                total: totalFollowUpsAllTime,
                scope: scopedFollowUpsFromDaily,
            },
            sessions: {
                total: allSessions.length,
                scope: allSessions.filter(session => isWithinScope(session.createdAt)).length,
            },
        };

        // Aggregate top languages
        const langMap: Record<string, number> = {};
        for (const d of daily) {
            for (const l of (d.topLanguages ?? [])) {
                langMap[l.language] = (langMap[l.language] ?? 0) + l.count;
            }
        }
        const topLanguages = Object.entries(langMap)
            .map(([language, count]) => ({ language, count }))
            .sort((a, b) => b.count - a.count);

        // Filter entities to the selected date scope.
        const cutoff = dates[dates.length - 1];
        const scopedUsers = allUsers.filter(u => u.lastSeenAt >= cutoff);
        const scopedSessions = allSessions.filter(s => s.createdAt >= cutoff);
        const scopedGames = allGames.filter(g => g.createdAt >= cutoff);

        const sessionsByUid = new Map<string, SessionDocument[]>();
        for (const session of scopedSessions) {
            const current = sessionsByUid.get(session.uid) ?? [];
            current.push(session);
            sessionsByUid.set(session.uid, current);
        }

        const gamesByUid = new Map<string, GameDocument[]>();
        for (const game of scopedGames) {
            const current = gamesByUid.get(game.uid) ?? [];
            current.push(game);
            gamesByUid.set(game.uid, current);
        }

        // Traits are lazy-loaded by the per-user detail endpoint to keep the dashboard
        // request under Cloudflare's subrequest limit.
        const traitsByUserId = new Map<string, { traits: TraitValueMap }>();

        const users = scopedUsers
            .map(user => {
                const userSessions = (sessionsByUid.get(user.uid) ?? []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
                const userGames = (gamesByUid.get(user.uid) ?? []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
                const locationKeys = Array.from(new Set(
                    userGames
                        .filter(game => game.location?.city || game.location?.country)
                        .map(game => buildLocationKey(game.location?.city ?? null, game.location?.country ?? null)),
                ));
                return {
                    uid: user.uid,
                    name: user.name,
                    alias: user.adminAlias ?? null,
                    gender: user.gender,
                    birthdate: user.birthdate,
                    language: user.preferences.language,
                    tone: user.preferences.tone,
                    latestDevice: userSessions[0]?.device ?? null,
                    totalReadings: user.stats.totalReadings,
                    totalFollowUps: user.stats.totalFollowUps,
                    readingsInPeriod: userGames.length,
                    questionsInPeriod: userGames.filter(game => !!game.question).length,
                    followUpsInPeriod: followUpsByUid.get(user.uid) ?? 0,
                    lastSeenAt: user.lastSeenAt,
                    lastCity: user.locations.lastCity,
                    lastCountry: user.locations.lastCountry,
                    userTraits: traitsByUserId.get(user.uid)?.traits ?? {},
                    sessionIds: userSessions.map(session => session.sessionId),
                    locationKeys,
                    recentGameIds: userGames.slice(0, 5).map(game => game.gameId),
                };
            })
            // Hide users with no readings in the selected period.
            .filter(user => user.readingsInPeriod > 0)
            .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));

        const sessions = scopedSessions
            .map(session => {
                const sessionGames = scopedGames
                    .filter(game => game.sessionId === session.sessionId)
                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
                return {
                    sessionId: session.sessionId,
                    uid: session.uid,
                    userName: userNameByUid.get(session.uid) ?? null,
                    userAlias: userAliasByUid.get(session.uid) ?? null,
                    createdAt: session.createdAt,
                    city: session.city,
                    country: session.country,
                    timezone: session.timezone,
                    device: session.device,
                    appVersion: session.appVersion,
                    gameCount: sessionGames.length,
                    questionCount: sessionGames.filter(game => !!game.question).length,
                    followUpCount: followUpsBySession.get(session.sessionId) ?? 0,
                    lastGameId: sessionGames[0]?.gameId ?? null,
                };
            })
            // Hide sessions with no readings in the selected period.
            .filter(session => session.gameCount > 0)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

        const locationMap = new Map<string, DashboardResponse['locations'][number]>();
        for (const game of scopedGames) {
            const key = buildLocationKey(game.location?.city ?? null, game.location?.country ?? null);
            if (!game.location?.city && !game.location?.country) {
                continue;
            }
            const current = locationMap.get(key) ?? {
                key,
                city: game.location?.city ?? null,
                country: game.location?.country ?? null,
                sessionCount: 0,
                gameCount: 0,
                userCount: 0,
                lastPlayedAt: game.createdAt,
                sampleGameIds: [],
                sampleUserIds: [],
            };
            current.gameCount += 1;
            current.lastPlayedAt = current.lastPlayedAt > game.createdAt ? current.lastPlayedAt : game.createdAt;
            if (current.sampleGameIds.length < 5 && !current.sampleGameIds.includes(game.gameId)) {
                current.sampleGameIds.push(game.gameId);
            }
            if (!current.sampleUserIds.includes(game.uid)) {
                current.sampleUserIds.push(game.uid);
                current.userCount = current.sampleUserIds.length;
            }
            locationMap.set(key, current);
        }
        for (const session of scopedSessions) {
            if (!session.city && !session.country) {
                continue;
            }
            const key = buildLocationKey(session.city, session.country);
            const current = locationMap.get(key);
            if (!current) {
                continue;
            }
            current.sessionCount += 1;
            if (session.createdAt > current.lastPlayedAt) {
                current.lastPlayedAt = session.createdAt;
            }
            if (!current.sampleUserIds.includes(session.uid)) {
                current.sampleUserIds.push(session.uid);
                current.userCount = current.sampleUserIds.length;
            }
        }
        const locations = Array.from(locationMap.values())
            .map(location => ({
                ...location,
                sampleUserIds: location.sampleUserIds.slice(0, 5),
            }))
            .sort((a, b) => b.lastPlayedAt.localeCompare(a.lastPlayedAt));

        // Import config for version info
        const { WORKER_CONFIG } = await import('../config.js');

        const response: DashboardResponse = {
            period: { from: dates[dates.length - 1], to: dates[0] },
            scopeDays: days,
            totals,
            daily: daily.sort((a, b) => a.date.localeCompare(b.date)),
            topLanguages,
            recentGames,
            users,
            sessions,
            locations,
            performance,
            activeUsersToday,
            schemaVersion: WORKER_CONFIG.schemaVersion,
            workerVersion: WORKER_CONFIG.version,
        };

        // Persist the cache. Best-effort — never block the response on a cache write failure.
        try {
            await env.R2.put(cacheKey, JSON.stringify({ ...response, cachedAt: new Date().toISOString() }), {
                httpMetadata: { contentType: 'application/json' },
            });
        } catch (cacheErr) {
            console.warn('Dashboard cache write failed:', cacheErr instanceof Error ? cacheErr.message : cacheErr);
        }

        return Response.json(response);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('Dashboard error:', message);
        return Response.json(
            { error: 'Dashboard failed', message },
            { status: 500 },
        );
    }
}
