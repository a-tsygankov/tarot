import type { GameDocument, TurnDocument } from '@shared/contracts/entity-contracts.js';
import { WORKER_CONFIG } from '../config.js';
import { r2GetJson, r2PutJson } from '../services/r2-adapter.js';

const GAMES_PREFIX = 'entities/games';
const TURNS_PREFIX = 'entities/turns';

export class R2GameRepository {
    constructor(private r2: R2Bucket) {}

    private gameKey(gameId: string): string {
        return `${GAMES_PREFIX}/${gameId}.json`;
    }

    private turnKey(gameId: string, turnNumber: number): string {
        return `${TURNS_PREFIX}/${gameId}/${turnNumber}.json`;
    }

    async getGame(gameId: string): Promise<GameDocument | null> {
        return r2GetJson<GameDocument>(this.r2, this.gameKey(gameId));
    }

    async createGame(params: {
        gameId: string;
        uid: string;
        sessionId: string;
        spreadType: number;
        cards: GameDocument['cards'];
        question: string | null;
        topic: string | null;
        language: string;
        tone: string;
    }): Promise<GameDocument> {
        const doc: GameDocument = {
            type: 'game',
            schemaVersion: WORKER_CONFIG.schemaVersion,
            gameId: params.gameId,
            uid: params.uid,
            sessionId: params.sessionId,
            createdAt: new Date().toISOString(),
            spreadType: params.spreadType,
            cards: params.cards,
            question: params.question,
            topic: params.topic,
            language: params.language,
            tone: params.tone,
            reading: {},
            readingDigest: null,
            turnCount: 0,
        };
        await r2PutJson(this.r2, this.gameKey(params.gameId), doc);
        return doc;
    }

    async applyReading(
        gameId: string,
        reading: Record<string, unknown>,
        readingDigest: string,
    ): Promise<void> {
        const doc = await this.getGame(gameId);
        if (!doc) throw new Error(`Game ${gameId} not found`);
        doc.reading = reading;
        doc.readingDigest = readingDigest;
        doc.turnCount += 1;
        await r2PutJson(this.r2, this.gameKey(gameId), doc);
    }

    async incrementTurnCount(gameId: string): Promise<void> {
        const doc = await this.getGame(gameId);
        if (!doc) throw new Error(`Game ${gameId} not found`);
        doc.turnCount += 1;
        await r2PutJson(this.r2, this.gameKey(gameId), doc);
    }

    async writeTurn(params: {
        gameId: string;
        uid: string;
        turnNumber: number;
        turnType: 'reading' | 'followup';
        question: string | null;
        questionDigest: string | null;
        answerText: string;
        answerDigest: string;
        userContextDelta: Record<string, unknown> | null;
        aiProvider: string;
        aiModel: string;
        responseTimeMs: number;
        tokenBudgetUsed: number;
    }): Promise<TurnDocument> {
        const doc: TurnDocument = {
            type: 'turn',
            schemaVersion: WORKER_CONFIG.schemaVersion,
            gameId: params.gameId,
            uid: params.uid,
            turnNumber: params.turnNumber,
            createdAt: new Date().toISOString(),
            turnType: params.turnType,
            question: params.question,
            questionDigest: params.questionDigest,
            answerText: params.answerText,
            answerDigest: params.answerDigest,
            userContextDelta: params.userContextDelta,
            aiProvider: params.aiProvider,
            aiModel: params.aiModel,
            responseTimeMs: params.responseTimeMs,
            tokenBudgetUsed: params.tokenBudgetUsed,
            success: true,
            errorMessage: null,
        };
        await r2PutJson(this.r2, this.turnKey(params.gameId, params.turnNumber), doc);
        return doc;
    }
}
