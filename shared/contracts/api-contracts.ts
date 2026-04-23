/**
 * API request/response contracts for all tarot-api Worker endpoints.
 */
import type { DeviceInfo } from '../models/user-context.js';

// ── Reading ──────────────────────────────────────────────────────────

export interface ReadingRequest {
    userContext: UserContextPayload;
    gameContext: GameContextPayload;
}

export interface ReadingResponse {
    reading: ReadingResult;
    contextUpdate: string;
    userContextDelta: UserContextDelta;
    userTraits: UserTraitsPayload | null;
    provider: string;
    model: string;
}

export interface ReadingResult {
    cards: Array<{
        position: string;
        name: string;
        reading: string;
    }>;
    overall: string;
}

// ── Follow-up ────────────────────────────────────────────────────────

export interface FollowUpRequest {
    userContext: UserContextPayload;
    gameContext: GameContextPayload;
    question: string;
}

export interface FollowUpResponse {
    answer: string;
    questionDigest: string;
    answerDigest: string;
    userContextDelta: UserContextDelta | null;
    userTraits: UserTraitsPayload | null;
}

// ── TTS ──────────────────────────────────────────────────────────────

export interface TtsRequest {
    text: string;
    language: string;
    voiceId?: string;
    model?: string;
    speed?: number;
}

export interface TtsFallbackResponse {
    fallback: true;
    reason: string;
}

export interface TtsErrorResponse {
    error: string;
    message: string;
    code?: string;
    details?: Record<string, unknown>;
}

// ── Session ──────────────────────────────────────────────────────────

export interface SessionRequest {
    uid: string;
    sessionId: string;
    appVersion: string;
    apiVersion: string;
    screenWidth?: number;
    screenHeight?: number;
    device?: string;
    deviceInfo?: DeviceInfo;
    language?: string;
    tone?: string;
    name?: string | null;
}

// ── Event ────────────────────────────────────────────────────────────

export interface EventRequest {
    uid: string;
    sessionId: string;
    eventType: string;
    eventData?: Record<string, unknown>;
}

// ── Version ──────────────────────────────────────────────────────────

export interface VersionResponse {
    app: { latest: string; minimumSupported: string };
    api: { current: string; supported: string[] };
    worker: { version: string };
    schema: { current: string };
    manifest: { id: string };
    compatibility: { status: 'ok' | 'outdated' | 'incompatible' };
    maintenanceMode: boolean;
}

// ── Shared payload shapes ────────────────────────────────────────────

export interface UserContextPayload {
    uid: string;
    sessionId: string;
    name: string | null;
    gender: string | null;
    birthdate: string | null;
    location: string | null;
    userTraits: UserTraitsPayload | null;
    language: string;
    tone: string;
}

export interface GameContextPayload {
    gameId: string;
    spreadType: number;
    cards: CardDraw[];
    question: string | null;
    topic: string | null;
    readingDigest: string | null;
    qaDigests: Array<{ role: 'user' | 'oracle'; digest: string }>;
    turnCount: number;
}

export interface CardDraw {
    name: string;
    position: string;
    reversed: boolean;
    keywords?: string[];
}

export interface UserContextDelta {
    name: string | null;
    gender: string | null;
    birthdate: string | null;
    location: string | null;
    traits: TraitValueMap;
}

export type TraitValueMap = Record<string, string[]>;

export interface UserTraitsPayload {
    id: string;
    userId: string;
    traits: TraitValueMap;
    createdAt: string;
    updatedAt: string;
}
