/**
 * Builders for R2 customMetadata. The dashboard reads these via list() instead
 * of GETing every entity body, which keeps a cold dashboard under Cloudflare's
 * 1000-subrequest/invocation limit.
 *
 * Rules:
 * - Values are always strings (R2 metadata is HTTP-header-backed).
 * - Non-ASCII fields (user names, city names) are encodeURIComponent'd.
 * - Total per-object metadata stays well under ~2 KB.
 * - Each builder stamps `metaV: '1'` so the migration backfill is idempotent
 *   and future shape changes can be detected.
 */

import type { GameDocument, SessionDocument, TurnDocument, UserDocument } from '@shared/contracts/entity-contracts.js';

const META_VERSION = '1';

function s(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value);
}

function enc(value: string | null | undefined): string {
    if (!value) return '';
    return encodeURIComponent(value);
}

export function buildUserMetadata(user: UserDocument): Record<string, string> {
    return {
        metaV: META_VERSION,
        uid: s(user.uid),
        firstSeenAt: s(user.firstSeenAt),
        lastSeenAt: s(user.lastSeenAt),
        nameEnc: enc(user.name),
        aliasEnc: enc(user.adminAlias),
        language: s(user.preferences?.language),
        tone: s(user.preferences?.tone),
        totalReadings: s(user.stats?.totalReadings ?? 0),
        totalFollowUps: s(user.stats?.totalFollowUps ?? 0),
        lastCityEnc: enc(user.locations?.lastCity),
        lastCountry: s(user.locations?.lastCountry),
    };
}

export function buildSessionMetadata(session: SessionDocument): Record<string, string> {
    return {
        metaV: META_VERSION,
        sessionId: s(session.sessionId),
        uid: s(session.uid),
        createdAt: s(session.createdAt),
        date: s(session.createdAt).slice(0, 10),
        cityEnc: enc(session.city),
        country: s(session.country),
        timezone: s(session.timezone),
        device: s(session.device),
        appVersion: s(session.appVersion),
    };
}

export function buildGameMetadata(game: GameDocument): Record<string, string> {
    return {
        metaV: META_VERSION,
        gameId: s(game.gameId),
        uid: s(game.uid),
        sessionId: s(game.sessionId),
        createdAt: s(game.createdAt),
        date: s(game.createdAt).slice(0, 10),
        spreadType: s(game.spreadType),
        language: s(game.language),
        tone: s(game.tone),
        turnCount: s(game.turnCount ?? 0),
        topicEnc: enc(game.topic),
        questionEnc: enc(game.question).slice(0, 200),
        cityEnc: enc(game.location?.city ?? null),
        country: s(game.location?.country ?? ''),
    };
}

export function buildTurnMetadata(turn: TurnDocument): Record<string, string> {
    return {
        metaV: META_VERSION,
        gameId: s(turn.gameId),
        uid: s(turn.uid),
        turnNumber: s(turn.turnNumber),
        turnType: s(turn.turnType),
        createdAt: s(turn.createdAt),
        date: s(turn.createdAt).slice(0, 10),
        aiProvider: s(turn.aiProvider),
        aiModel: s(turn.aiModel),
        responseTimeMs: s(turn.responseTimeMs ?? 0),
        success: s(turn.success),
    };
}

// Decoded views used by the dashboard. These convert the string-typed
// customMetadata back into the typed shape the aggregation code expects.

export interface UserSummary {
    uid: string;
    firstSeenAt: string;
    lastSeenAt: string;
    name: string | null;
    adminAlias: string | null;
    language: string;
    tone: string;
    totalReadings: number;
    totalFollowUps: number;
    lastCity: string | null;
    lastCountry: string | null;
}

export interface GameSummary {
    gameId: string;
    uid: string;
    sessionId: string;
    createdAt: string;
    date: string;
    spreadType: number;
    language: string;
    tone: string;
    turnCount: number;
    topic: string | null;
    question: string | null;
    city: string | null;
    country: string | null;
}

export interface TurnSummary {
    gameId: string;
    uid: string;
    turnNumber: number;
    turnType: 'reading' | 'followup' | string;
    createdAt: string;
    date: string;
    aiProvider: string;
    aiModel: string;
    responseTimeMs: number;
    success: boolean;
}

function dec(v: string): string | null {
    if (!v) return null;
    try { return decodeURIComponent(v); } catch { return v; }
}

function nz(v: string | undefined): string { return v ?? ''; }

export function parseUserMeta(meta: Record<string, string>): UserSummary | null {
    if (!meta.uid) return null;
    return {
        uid: meta.uid,
        firstSeenAt: nz(meta.firstSeenAt),
        lastSeenAt: nz(meta.lastSeenAt),
        name: dec(nz(meta.nameEnc)),
        adminAlias: dec(nz(meta.aliasEnc)),
        language: nz(meta.language),
        tone: nz(meta.tone),
        totalReadings: parseInt(meta.totalReadings ?? '0', 10) || 0,
        totalFollowUps: parseInt(meta.totalFollowUps ?? '0', 10) || 0,
        lastCity: dec(nz(meta.lastCityEnc)),
        lastCountry: meta.lastCountry || null,
    };
}

export function parseGameMeta(meta: Record<string, string>): GameSummary | null {
    if (!meta.gameId) return null;
    return {
        gameId: meta.gameId,
        uid: nz(meta.uid),
        sessionId: nz(meta.sessionId),
        createdAt: nz(meta.createdAt),
        date: nz(meta.date) || nz(meta.createdAt).slice(0, 10),
        spreadType: parseInt(meta.spreadType ?? '0', 10) || 0,
        language: nz(meta.language),
        tone: nz(meta.tone),
        turnCount: parseInt(meta.turnCount ?? '0', 10) || 0,
        topic: dec(nz(meta.topicEnc)),
        question: dec(nz(meta.questionEnc)),
        city: dec(nz(meta.cityEnc)),
        country: meta.country || null,
    };
}

export function parseTurnMeta(meta: Record<string, string>): TurnSummary | null {
    if (!meta.gameId || !meta.turnNumber) return null;
    return {
        gameId: meta.gameId,
        uid: nz(meta.uid),
        turnNumber: parseInt(meta.turnNumber, 10) || 0,
        turnType: nz(meta.turnType),
        createdAt: nz(meta.createdAt),
        date: nz(meta.date) || nz(meta.createdAt).slice(0, 10),
        aiProvider: nz(meta.aiProvider),
        aiModel: nz(meta.aiModel),
        responseTimeMs: parseInt(meta.responseTimeMs ?? '0', 10) || 0,
        success: meta.success === 'true',
    };
}
