import type { Env } from '../env.js';
import type { DailySummary, GameDocument, SessionDocument, TurnDocument, UserDocument, UserTraitsDocument } from '@shared/contracts/entity-contracts.js';
import { buildLocationKey, listDocuments, requireAdmin } from './admin-helpers.js';

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
        gender: string | null;
        birthdate: string | null;
        language: string;
        tone: string;
        latestDevice: string | null;
        totalReadings: number;
        totalFollowUps: number;
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
        createdAt: string;
        city: string | null;
        country: string | null;
        timezone: string | null;
        device: string | null;
        appVersion: string;
        gameCount: number;
        questionCount: number;
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
    const days = [1, 7, 30].includes(requestedDays) ? requestedDays : 7;

    try {
        const today = new Date();
        const dates: string[] = [];
        for (let i = 0; i < days; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            dates.push(d.toISOString().slice(0, 10));
        }

        // Fetch daily summaries in parallel
        const dailyPromises = dates.map(async (date) => {
            const obj = await env.R2.get(`analytics/daily/${date}.json`);
            if (!obj) return null;
            try {
                return await obj.json() as DailySummary;
            } catch {
                return null;
            }
        });

        // Fetch active users for today
        const activeUsersPromise = (async () => {
            const obj = await env.R2.get(`indexes/active-users/${dates[0]}.json`);
            if (!obj) return 0;
            try {
                const data = await obj.json() as { uids: string[] };
                return data.uids?.length ?? 0;
            } catch {
                return 0;
            }
        })();

        const [allUsers, allSessions, allGames, allTurns, allUserTraits] = await Promise.all([
            listDocuments<UserDocument>(env.R2, 'entities/users/'),
            listDocuments<SessionDocument>(env.R2, 'entities/sessions/'),
            listDocuments<GameDocument>(env.R2, 'entities/games/'),
            listDocuments<TurnDocument>(env.R2, 'entities/turns/'),
            listDocuments<UserTraitsDocument>(env.R2, 'entities/user-traits/'),
        ]);

        const userNameByUid = new Map<string, string | null>();
        for (const user of allUsers) {
            userNameByUid.set(user.uid, user.name);
        }

        // Fetch recent games (last 20)
        const recentGamesPromise = (async () => {
            const games: DashboardResponse['recentGames'] = [];
            // Check last few date indexes
            for (const date of dates.slice(0, 3)) {
                const idx = await env.R2.get(`indexes/date-games/${date}.json`);
                if (!idx) continue;
                try {
                    const data = await idx.json() as { gameIds: string[] };
                    const gameIds = (data.gameIds ?? []).slice(-10);
                    for (const gid of gameIds) {
                        const gObj = await env.R2.get(`entities/games/${gid}.json`);
                        if (!gObj) continue;
                        try {
                            const g = await gObj.json() as Record<string, unknown>;
                            const uid = g.uid as string;
                            games.push({
                                gameId: g.gameId as string,
                                uid,
                                userName: userNameByUid.get(uid) ?? null,
                                sessionId: g.sessionId as string,
                                spreadType: g.spreadType as number,
                                question: g.question as string | null,
                                topic: g.topic as string | null,
                                language: g.language as string,
                                tone: g.tone as string,
                                turnCount: g.turnCount as number,
                                city: (g.location as { city?: string | null } | undefined)?.city ?? null,
                                country: (g.location as { country?: string | null } | undefined)?.country ?? null,
                                createdAt: g.createdAt as string,
                            });
                        } catch { /* skip malformed */ }
                    }
                } catch { /* skip */ }
                if (games.length >= 20) break;
            }
            return games.slice(-20).reverse();
        })();

        const [dailyResults, activeUsersToday, recentGames] = await Promise.all([
            Promise.all(dailyPromises),
            activeUsersPromise,
            recentGamesPromise,
        ]);
        const daily = dailyResults.filter((d): d is DailySummary => d !== null);
        const scopeStart = dates[dates.length - 1];
        const isWithinScope = (iso: string | null | undefined) => Boolean(iso && iso.slice(0, 10) >= scopeStart);
        const scopedReadingTurns = allTurns.filter(turn => turn.turnType === 'reading' && isWithinScope(turn.createdAt));
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

        // Aggregate totals
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
                total: allTurns.filter(turn => turn.turnType === 'followup').length,
                scope: allTurns.filter(turn => turn.turnType === 'followup' && isWithinScope(turn.createdAt)).length,
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

        // Filter entities to the selected date scope
        const cutoff = dates[dates.length - 1]; // earliest date in range (YYYY-MM-DD)
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

        const traitsByUserId = new Map<string, UserTraitsDocument>();
        for (const traits of allUserTraits) {
            traitsByUserId.set(traits.userId, traits);
        }

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
                    gender: user.gender,
                    birthdate: user.birthdate,
                    language: user.preferences.language,
                    tone: user.preferences.tone,
                    latestDevice: userSessions[0]?.device ?? null,
                    totalReadings: user.stats.totalReadings,
                    totalFollowUps: user.stats.totalFollowUps,
                    lastSeenAt: user.lastSeenAt,
                    lastCity: user.locations.lastCity,
                    lastCountry: user.locations.lastCountry,
                    userTraits: traitsByUserId.get(user.uid)?.traits ?? {},
                    sessionIds: userSessions.map(session => session.sessionId),
                    locationKeys,
                    recentGameIds: userGames.slice(0, 5).map(game => game.gameId),
                };
            })
            .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));

        const sessions = scopedSessions
            .map(session => {
                const sessionGames = scopedGames
                    .filter(game => game.sessionId === session.sessionId)
                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
                return {
                    sessionId: session.sessionId,
                    uid: session.uid,
                    createdAt: session.createdAt,
                    city: session.city,
                    country: session.country,
                    timezone: session.timezone,
                    device: session.device,
                    appVersion: session.appVersion,
                    gameCount: sessionGames.length,
                    questionCount: sessionGames.filter(game => !!game.question).length,
                    lastGameId: sessionGames[0]?.gameId ?? null,
                };
            })
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
