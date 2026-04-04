import type { Env } from '../env.js';
import type { UserDocument, GameDocument, TurnDocument } from '@shared/contracts/entity-contracts.js';

/**
 * GET /api/admin/user/:uid
 * Returns full user profile including traits, stats, preferences.
 */
export async function handleAdminUserDetail(request: Request, env: Env, uid: string): Promise<Response> {
    const authKey = request.headers.get('X-Admin-Key');
    if (authKey !== env.ANALYTICS_KEY) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const userObj = await env.R2.get(`entities/users/${uid}.json`);
        if (!userObj) {
            return Response.json({ error: 'User not found' }, { status: 404 });
        }

        const user = await userObj.json() as UserDocument;

        // Fetch user's game index
        const indexObj = await env.R2.get(`indexes/user-games/${uid}.json`);
        const gameIndex = indexObj
            ? await indexObj.json() as Array<{ id: string; createdAt: string }>
            : [];

        // Fetch summary for each game (last 50)
        const recentEntries = gameIndex.slice(-50).reverse();
        const games: Array<{
            gameId: string;
            spreadType: number;
            question: string | null;
            topic: string | null;
            language: string;
            tone: string;
            turnCount: number;
            createdAt: string;
            location: { country: string | null; city: string | null; timezone: string | null } | null;
        }> = [];

        for (const entry of recentEntries) {
            const gObj = await env.R2.get(`entities/games/${entry.id}.json`);
            if (!gObj) continue;
            try {
                const g = await gObj.json() as GameDocument & {
                    location?: { country: string | null; city: string | null; timezone: string | null };
                };
                games.push({
                    gameId: g.gameId,
                    spreadType: g.spreadType,
                    question: g.question,
                    topic: g.topic,
                    language: g.language,
                    tone: g.tone,
                    turnCount: g.turnCount,
                    createdAt: g.createdAt,
                    location: g.location ?? null,
                });
            } catch { /* skip malformed */ }
        }

        // Collect unique locations from games
        const locationSet = new Map<string, { country: string | null; city: string | null; timezone: string | null; lastSeen: string }>();
        for (const g of games) {
            if (g.location?.country || g.location?.city) {
                const key = `${g.location.country ?? ''}|${g.location.city ?? ''}`;
                const existing = locationSet.get(key);
                if (!existing || g.createdAt > existing.lastSeen) {
                    locationSet.set(key, { ...g.location, lastSeen: g.createdAt });
                }
            }
        }
        const locations = Array.from(locationSet.values())
            .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));

        return Response.json({
            user,
            games,
            locations,
            totalGames: gameIndex.length,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return Response.json({ error: 'Failed to load user', message }, { status: 500 });
    }
}

/**
 * GET /api/admin/game/:gameId
 * Returns full game document with all turns.
 */
export async function handleAdminGameDetail(request: Request, env: Env, gameId: string): Promise<Response> {
    const authKey = request.headers.get('X-Admin-Key');
    if (authKey !== env.ANALYTICS_KEY) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const gameObj = await env.R2.get(`entities/games/${gameId}.json`);
        if (!gameObj) {
            return Response.json({ error: 'Game not found' }, { status: 404 });
        }

        const game = await gameObj.json() as GameDocument;

        // Fetch all turns
        const turns: TurnDocument[] = [];
        for (let t = 1; t <= game.turnCount + 1; t++) {
            const tObj = await env.R2.get(`entities/turns/${gameId}/${t}.json`);
            if (!tObj) continue;
            try {
                turns.push(await tObj.json() as TurnDocument);
            } catch { /* skip */ }
        }

        return Response.json({ game, turns });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return Response.json({ error: 'Failed to load game', message }, { status: 500 });
    }
}
