import type { Env } from '../env.js';
import type { DailySummary } from '@shared/contracts/entity-contracts.js';

/**
 * Dashboard data response.
 * Aggregated from R2 analytics, user index, and recent game data.
 */
export interface DashboardResponse {
    period: { from: string; to: string };
    totals: {
        users: number;
        readings: number;
        followUps: number;
        sessions: number;
    };
    daily: DailySummary[];
    topLanguages: Array<{ language: string; count: number }>;
    recentGames: Array<{
        gameId: string;
        uid: string;
        spreadType: number;
        question: string | null;
        topic: string | null;
        language: string;
        tone: string;
        turnCount: number;
        createdAt: string;
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
 * GET /api/admin/dashboard?days=7
 * Returns aggregated analytics for the dashboard.
 * Protected by ANALYTICS_KEY.
 */
export async function handleDashboard(request: Request, env: Env): Promise<Response> {
    const authKey = request.headers.get('X-Admin-Key');
    if (authKey !== env.ANALYTICS_KEY) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const days = Math.min(parseInt(url.searchParams.get('days') ?? '7', 10), 90);

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
                            games.push({
                                gameId: g.gameId as string,
                                uid: (g.uid as string)?.slice(0, 8) + '...',
                                spreadType: g.spreadType as number,
                                question: g.question as string | null,
                                topic: g.topic as string | null,
                                language: g.language as string,
                                tone: g.tone as string,
                                turnCount: g.turnCount as number,
                                createdAt: g.createdAt as string,
                            });
                        } catch { /* skip malformed */ }
                    }
                } catch { /* skip */ }
                if (games.length >= 20) break;
            }
            return games.slice(-20).reverse();
        })();

        // Fetch performance from recent turns
        const perfPromise = (async () => {
            let totalMs = 0;
            let count = 0;
            const providers: Record<string, number> = {};
            // Sample from today's and yesterday's games
            for (const date of dates.slice(0, 2)) {
                const idx = await env.R2.get(`indexes/date-games/${date}.json`);
                if (!idx) continue;
                try {
                    const data = await idx.json() as { gameIds: string[] };
                    const gameIds = (data.gameIds ?? []).slice(-5);
                    for (const gid of gameIds) {
                        // Check turn 1
                        const tObj = await env.R2.get(`entities/turns/${gid}/1.json`);
                        if (!tObj) continue;
                        try {
                            const t = await tObj.json() as Record<string, unknown>;
                            const ms = t.responseTimeMs as number;
                            const provider = t.aiProvider as string;
                            if (ms > 0) {
                                totalMs += ms;
                                count++;
                            }
                            if (provider) {
                                providers[provider] = (providers[provider] ?? 0) + 1;
                            }
                        } catch { /* skip */ }
                    }
                } catch { /* skip */ }
            }
            return {
                avgResponseMs: count > 0 ? Math.round(totalMs / count) : 0,
                totalTurns: count,
                providerBreakdown: providers,
            };
        })();

        // Count total users
        const userCountPromise = (async () => {
            const list = await env.R2.list({ prefix: 'entities/users/', limit: 1000 });
            return list.objects.length;
        })();

        const [dailyResults, activeUsersToday, recentGames, performance, userCount] = await Promise.all([
            Promise.all(dailyPromises),
            activeUsersPromise,
            recentGamesPromise,
            perfPromise,
            userCountPromise,
        ]);

        const daily = dailyResults.filter((d): d is DailySummary => d !== null);

        // Aggregate totals
        const totals = {
            users: userCount,
            readings: daily.reduce((s, d) => s + (d.readings ?? 0), 0),
            followUps: daily.reduce((s, d) => s + (d.followUps ?? 0), 0),
            sessions: daily.reduce((s, d) => s + (d.sessions ?? 0), 0),
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

        // Import config for version info
        const { WORKER_CONFIG } = await import('../config.js');

        const response: DashboardResponse = {
            period: { from: dates[dates.length - 1], to: dates[0] },
            totals,
            daily: daily.sort((a, b) => a.date.localeCompare(b.date)),
            topLanguages,
            recentGames,
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
