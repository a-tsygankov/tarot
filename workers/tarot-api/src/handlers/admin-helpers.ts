import type { Env } from '../env.js';
import type { GameDocument, SessionDocument, TurnDocument, UserDocument } from '@shared/contracts/entity-contracts.js';

export function requireAdmin(request: Request, env: Env): Response | null {
    const authKey = request.headers.get('X-Admin-Key');
    if (authKey !== env.ANALYTICS_KEY) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return null;
}

export async function loadJson<T>(bucket: R2Bucket, key: string): Promise<T | null> {
    const object = await bucket.get(key);
    if (!object) {
        return null;
    }

    return await object.json() as T;
}

export async function listDocuments<T>(bucket: R2Bucket, prefix: string): Promise<T[]> {
    const list = await bucket.list({ prefix, limit: 1000 });
    const docs = await Promise.all(
        list.objects.map(async ({ key }) => loadJson<T>(bucket, key)),
    );
    return docs.filter(doc => doc !== null) as T[];
}

export async function resolveUid(bucket: R2Bucket, uidOrFragment: string): Promise<string | null> {
    const trimmed = uidOrFragment.trim();
    if (!trimmed) {
        return null;
    }

    const exact = await bucket.get(`entities/users/${trimmed}.json`);
    if (exact) {
        return trimmed;
    }

    const users = await listDocuments<UserDocument>(bucket, 'entities/users/');
    return users.find(user => user.uid.startsWith(trimmed))?.uid ?? null;
}

export function summarizeGame(game: GameDocument) {
    return {
        gameId: game.gameId,
        uid: game.uid,
        sessionId: game.sessionId,
        spreadType: game.spreadType,
        question: game.question,
        topic: game.topic,
        language: game.language,
        tone: game.tone,
        turnCount: game.turnCount,
        createdAt: game.createdAt,
        location: game.location ?? null,
    };
}

export function summarizeSession(
    session: SessionDocument,
    games: GameDocument[],
    turns: TurnDocument[],
) {
    return {
        sessionId: session.sessionId,
        uid: session.uid,
        createdAt: session.createdAt,
        country: session.country,
        city: session.city,
        timezone: session.timezone,
        device: session.device,
        appVersion: session.appVersion,
        screenWidth: session.screenWidth,
        screenHeight: session.screenHeight,
        gameCount: games.length,
        questionCount: games.filter(game => !!game.question).length,
        followUpCount: turns.filter(turn => turn.turnType === 'followup').length,
        lastGameId: games.at(-1)?.gameId ?? null,
    };
}

export function buildLocationKey(city: string | null, country: string | null): string {
    return encodeURIComponent(`${city ?? ''}|${country ?? ''}`);
}

export function parseLocationKey(raw: string): { city: string | null; country: string | null } {
    const [city, country] = decodeURIComponent(raw).split('|');
    return {
        city: city || null,
        country: country || null,
    };
}
