import type { Env } from '../env.js';
import type { GameDocument, SessionDocument, TurnDocument, UserDocument, UserTraitsDocument } from '@shared/contracts/entity-contracts.js';
import {
    buildLocationKey,
    listDocuments,
    loadJson,
    parseLocationKey,
    requireAdmin,
    resolveUid,
    summarizeGame,
    summarizeSession,
} from './admin-helpers.js';

/**
 * GET /api/admin/user/:uid
 * Returns a full user profile with games, sessions, locations, and extracted traits.
 */
export async function handleAdminUserDetail(request: Request, env: Env, uidFragment: string): Promise<Response> {
    const unauthorized = requireAdmin(request, env);
    if (unauthorized) {
        return unauthorized;
    }

    try {
        const uid = await resolveUid(env.R2, uidFragment);
        if (!uid) {
            return Response.json({ error: 'User not found' }, { status: 404 });
        }

        const user = await loadJson<UserDocument>(env.R2, `entities/users/${uid}.json`);
        if (!user) {
            return Response.json({ error: 'User not found' }, { status: 404 });
        }

        const [allGames, allSessions, userTraits] = await Promise.all([
            listDocuments<GameDocument>(env.R2, 'entities/games/'),
            listDocuments<SessionDocument>(env.R2, 'entities/sessions/'),
            loadJson<UserTraitsDocument>(env.R2, `entities/user-traits/traits-${uid}.json`),
        ]);

        const userGames = allGames
            .filter(game => game.uid === uid)
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        const userSessions = allSessions
            .filter(session => session.uid === uid)
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

        const turns = await Promise.all(
            userGames.flatMap(game =>
                Array.from({ length: game.turnCount + 1 }, (_, index) =>
                    loadJson<TurnDocument>(env.R2, `entities/turns/${game.gameId}/${index + 1}.json`),
                ),
            ),
        );
        const userTurns = turns.filter((turn): turn is TurnDocument => turn !== null);

        const locationMap = new Map<string, { country: string | null; city: string | null; timezone: string | null; lastSeen: string }>();
        for (const game of userGames) {
            if (!game.location?.country && !game.location?.city) {
                continue;
            }
            const key = `${game.location?.city ?? ''}|${game.location?.country ?? ''}`;
            const current = locationMap.get(key);
            if (!current || game.createdAt > current.lastSeen) {
                locationMap.set(key, {
                    country: game.location?.country ?? null,
                    city: game.location?.city ?? null,
                    timezone: game.location?.timezone ?? null,
                    lastSeen: game.createdAt,
                });
            }
        }

        const sessions = userSessions.map(session => {
            const sessionGames = userGames.filter(game => game.sessionId === session.sessionId);
            const sessionTurns = userTurns.filter(turn => turn.uid === uid && sessionGames.some(game => game.gameId === turn.gameId));
            return summarizeSession(session, sessionGames, sessionTurns);
        }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

        return Response.json({
            user: {
                ...user,
                userTraits: userTraits?.traits ?? {},
                latestDevice: userSessions.at(-1)?.device ?? null,
            },
            games: userGames.slice().reverse().map(summarizeGame),
            sessions,
            locations: Array.from(locationMap.values()).sort((a, b) => b.lastSeen.localeCompare(a.lastSeen)),
            totalGames: userGames.length,
            totalSessions: userSessions.length,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return Response.json({ error: 'Failed to load user', message }, { status: 500 });
    }
}

/**
 * GET /api/admin/game/:gameId
 * Returns full game document, session context, and all turns.
 */
export async function handleAdminGameDetail(request: Request, env: Env, gameId: string): Promise<Response> {
    const unauthorized = requireAdmin(request, env);
    if (unauthorized) {
        return unauthorized;
    }

    try {
        const game = await loadJson<GameDocument>(env.R2, `entities/games/${gameId}.json`);
        if (!game) {
            return Response.json({ error: 'Game not found' }, { status: 404 });
        }

        const [session, user, userTraits] = await Promise.all([
            loadJson<SessionDocument>(env.R2, `entities/sessions/${game.sessionId}.json`),
            loadJson<UserDocument>(env.R2, `entities/users/${game.uid}.json`),
            loadJson<UserTraitsDocument>(env.R2, `entities/user-traits/traits-${game.uid}.json`),
        ]);

        const turns = await Promise.all(
            Array.from({ length: game.turnCount + 1 }, (_, index) =>
                loadJson<TurnDocument>(env.R2, `entities/turns/${game.gameId}/${index + 1}.json`),
            ),
        );

        return Response.json({
            game,
            session,
            user: user ? {
                uid: user.uid,
                name: user.name,
                lastCity: user.locations.lastCity,
                lastCountry: user.locations.lastCountry,
                userTraits: userTraits?.traits ?? {},
            } : null,
            turns: turns.filter((turn): turn is TurnDocument => turn !== null),
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return Response.json({ error: 'Failed to load game', message }, { status: 500 });
    }
}

/**
 * GET /api/admin/session/:sessionId
 * Returns the session document, user, games in the session, and all session turns.
 */
export async function handleAdminSessionDetail(request: Request, env: Env, sessionId: string): Promise<Response> {
    const unauthorized = requireAdmin(request, env);
    if (unauthorized) {
        return unauthorized;
    }

    try {
        const session = await loadJson<SessionDocument>(env.R2, `entities/sessions/${sessionId}.json`);
        if (!session) {
            return Response.json({ error: 'Session not found' }, { status: 404 });
        }

        const [allGames, user, userTraits] = await Promise.all([
            listDocuments<GameDocument>(env.R2, 'entities/games/'),
            loadJson<UserDocument>(env.R2, `entities/users/${session.uid}.json`),
            loadJson<UserTraitsDocument>(env.R2, `entities/user-traits/traits-${session.uid}.json`),
        ]);
        const sessionGames = allGames
            .filter(game => game.sessionId === sessionId)
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

        const turns = await Promise.all(
            sessionGames.flatMap(game =>
                Array.from({ length: game.turnCount + 1 }, (_, index) =>
                    loadJson<TurnDocument>(env.R2, `entities/turns/${game.gameId}/${index + 1}.json`),
                ),
            ),
        );

        return Response.json({
            session,
            user: user ? {
                ...user,
                userTraits: userTraits?.traits ?? {},
            } : null,
            games: sessionGames.map(summarizeGame),
            turns: turns.filter((turn): turn is TurnDocument => turn !== null)
                .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return Response.json({ error: 'Failed to load session', message }, { status: 500 });
    }
}

/**
 * GET /api/admin/location/:locationKey
 * Returns all sessions, games, and users for a specific city/country combination.
 */
export async function handleAdminLocationDetail(request: Request, env: Env, locationKey: string): Promise<Response> {
    const unauthorized = requireAdmin(request, env);
    if (unauthorized) {
        return unauthorized;
    }

    try {
        const target = parseLocationKey(locationKey);
        const [allGames, allSessions, allUsers, allUserTraits] = await Promise.all([
            listDocuments<GameDocument>(env.R2, 'entities/games/'),
            listDocuments<SessionDocument>(env.R2, 'entities/sessions/'),
            listDocuments<UserDocument>(env.R2, 'entities/users/'),
            listDocuments<UserTraitsDocument>(env.R2, 'entities/user-traits/'),
        ]);
        const traitsByUserId = new Map(allUserTraits.map(doc => [doc.userId, doc]));

        const matchesLocation = (city: string | null, country: string | null) =>
            (city ?? null) === target.city && (country ?? null) === target.country;

        const games = allGames
            .filter(game => matchesLocation(game.location?.city ?? null, game.location?.country ?? null))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const gameSessionIds = new Set(games.map(game => game.sessionId));
        const sessions = allSessions
            .filter(session => matchesLocation(session.city, session.country) || gameSessionIds.has(session.sessionId))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const userIds = new Set([...games.map(game => game.uid), ...sessions.map(session => session.uid)]);
        const users = allUsers
            .filter(user => userIds.has(user.uid))
            .map(user => ({
                uid: user.uid,
                name: user.name,
                lastCity: user.locations.lastCity,
                lastCountry: user.locations.lastCountry,
                totalReadings: user.stats.totalReadings,
                userTraits: traitsByUserId.get(user.uid)?.traits ?? {},
            }))
            .sort((a, b) => b.totalReadings - a.totalReadings);

        return Response.json({
            location: {
                key: buildLocationKey(target.city, target.country),
                city: target.city,
                country: target.country,
            },
            sessions: sessions.map(session => {
                const sessionGames = games.filter(game => game.sessionId === session.sessionId);
                return summarizeSession(session, sessionGames, []);
            }),
            games: games.map(summarizeGame),
            users,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return Response.json({ error: 'Failed to load location', message }, { status: 500 });
    }
}
