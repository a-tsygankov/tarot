import type { TraitValueMap, UserContextPayload, UserTraitsPayload } from '@shared/contracts/api-contracts.js';
import type { ActiveSchemaDocument, GameDocument, TurnDocument, UserDocument } from '@shared/contracts/entity-contracts.js';
import { WORKER_CONFIG } from '../config.js';
import { R2SchemaRepository } from '../repositories/schema-repository.js';
import { r2GetJson, r2PutJson } from './r2-adapter.js';
import { sanitizeTraitMap } from './prompt-safety.js';

const TARGET_VERSION = WORKER_CONFIG.schemaVersion;
const USER_PREFIX = 'entities/users/';
const GAME_PREFIX = 'entities/games/';
const TURN_PREFIX = 'entities/turns/';
const TRAITS_PREFIX = 'entities/user-traits/';

export class SchemaUpgradeService {
    constructor(
        private readonly r2: R2Bucket,
        private readonly schemaRepo: R2SchemaRepository,
    ) {}

    async ensureCurrentSchema(): Promise<void> {
        const active = await this.ensureActiveSchema();
        const upgradeState = await this.schemaRepo.getUpgradeState(TARGET_VERSION);
        const previousStartedAt = typeof upgradeState?.startedAt === 'string'
            ? upgradeState.startedAt
            : new Date().toISOString();
        if (active.schemaVersion === TARGET_VERSION && upgradeState?.status === 'completed') {
            return;
        }
        if (upgradeState?.status === 'running') {
            return;
        }

        await this.schemaRepo.putUpgradeState(TARGET_VERSION, {
            version: TARGET_VERSION,
            status: 'running',
            startedAt: new Date().toISOString(),
            sourceSchemaVersion: active.schemaVersion,
        });

        try {
            await this.runUserTraitsUpgrade();
            await this.schemaRepo.setActive({
                schemaVersion: TARGET_VERSION,
                compatibilityApiMin: active.compatibilityApiMin,
                compatibilityApiMax: active.compatibilityApiMax,
                activatedAt: new Date().toISOString(),
                sourceSchemaVersion: active.schemaVersion,
                status: 'active',
            });
            await this.schemaRepo.putUpgradeState(TARGET_VERSION, {
                version: TARGET_VERSION,
                status: 'completed',
                startedAt: previousStartedAt,
                completedAt: new Date().toISOString(),
                sourceSchemaVersion: active.schemaVersion,
            });
        } catch (error) {
            await this.schemaRepo.putUpgradeState(TARGET_VERSION, {
                version: TARGET_VERSION,
                status: 'failed',
                startedAt: previousStartedAt,
                completedAt: new Date().toISOString(),
                sourceSchemaVersion: active.schemaVersion,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    private async ensureActiveSchema(): Promise<ActiveSchemaDocument> {
        const existing = await this.schemaRepo.getActive();
        if (existing) {
            return existing;
        }

        const doc: ActiveSchemaDocument = {
            schemaVersion: TARGET_VERSION,
            compatibilityApiMin: WORKER_CONFIG.apiVersion,
            compatibilityApiMax: WORKER_CONFIG.apiVersion,
            activatedAt: new Date().toISOString(),
            sourceSchemaVersion: null,
            status: 'active',
        };
        await this.schemaRepo.setActive(doc);
        return doc;
    }

    private async runUserTraitsUpgrade(): Promise<void> {
        const userTraitsMap = await this.migrateUsers();
        await this.migrateGames(userTraitsMap);
        await this.migrateTurns();
    }

    private async migrateUsers(): Promise<Map<string, UserTraitsPayload>> {
        const users = await this.listDocuments<UserDocument>(USER_PREFIX);
        const result = new Map<string, UserTraitsPayload>();

        for (const user of users) {
            const legacyTraits = this.readLegacyUserTraits(user as UserDocument & { traits?: Record<string, string> });
            const payload = await this.ensureTraitsDocument(user.uid, legacyTraits);
            result.set(user.uid, payload);

            const upgraded: UserDocument = {
                ...user,
                schemaVersion: TARGET_VERSION,
                userTraitsId: payload.id,
            };
            delete (upgraded as UserDocument & { traits?: unknown }).traits;
            await r2PutJson(this.r2, `${USER_PREFIX}${user.uid}.json`, upgraded);
        }

        return result;
    }

    private async migrateGames(userTraitsMap: Map<string, UserTraitsPayload>): Promise<void> {
        const games = await this.listDocuments<GameDocument>(GAME_PREFIX);

        for (const game of games) {
            const upgraded: GameDocument = {
                ...game,
                schemaVersion: TARGET_VERSION,
            };

            const originalRequest = upgraded.originalRequest;
            const legacyUserContext = originalRequest?.userContext as (UserContextPayload & { traits?: Record<string, string> }) | undefined;
            if (legacyUserContext) {
                const payload = userTraitsMap.get(legacyUserContext.uid) ?? await this.ensureTraitsDocument(
                    legacyUserContext.uid,
                    this.readLegacyContextTraits(legacyUserContext),
                );
                const request = originalRequest!;
                upgraded.originalRequest = {
                    ...request,
                    userContext: {
                        ...legacyUserContext,
                        userTraits: payload,
                    },
                };
                delete (upgraded.originalRequest!.userContext as UserContextPayload & { traits?: unknown }).traits;
            }

            await r2PutJson(this.r2, `${GAME_PREFIX}${game.gameId}.json`, upgraded);
        }
    }

    private async migrateTurns(): Promise<void> {
        const turns = await this.listDocuments<TurnDocument>(TURN_PREFIX);
        for (const turn of turns) {
            const upgraded: TurnDocument = {
                ...turn,
                schemaVersion: TARGET_VERSION,
            };
            const legacyDelta = upgraded.userContextDelta as ({ traits?: Record<string, string> | TraitValueMap } & Record<string, unknown>) | null;
            if (legacyDelta && 'traits' in legacyDelta) {
                legacyDelta.traits = this.normalizeLegacyTraits(legacyDelta.traits);
                upgraded.userContextDelta = legacyDelta;
            }
            await r2PutJson(this.r2, `${TURN_PREFIX}${turn.gameId}/${turn.turnNumber}.json`, upgraded);
        }
    }

    private async ensureTraitsDocument(userId: string, traits: TraitValueMap): Promise<UserTraitsPayload> {
        const id = `traits-${userId}`;
        const key = `${TRAITS_PREFIX}${id}.json`;
        const now = new Date().toISOString();
        const existing = await r2GetJson<{
            id: string;
            userId: string;
            traits: TraitValueMap;
            createdAt: string;
            updatedAt: string;
        }>(this.r2, key);

        const payload: UserTraitsPayload = existing ? {
            id: existing.id,
            userId: existing.userId,
            traits: sanitizeTraitMap({ ...existing.traits, ...traits }),
            createdAt: existing.createdAt,
            updatedAt: now,
        } : {
            id,
            userId,
            traits: sanitizeTraitMap(traits),
            createdAt: now,
            updatedAt: now,
        };

        await r2PutJson(this.r2, key, {
            type: 'user-traits',
            schemaVersion: TARGET_VERSION,
            ...payload,
        });

        return payload;
    }

    private readLegacyUserTraits(user: UserDocument & { traits?: Record<string, string> }): TraitValueMap {
        return this.normalizeLegacyTraits(user.traits);
    }

    private readLegacyContextTraits(userContext: UserContextPayload & { traits?: Record<string, string> }): TraitValueMap {
        if (userContext.userTraits?.traits) {
            return sanitizeTraitMap(userContext.userTraits.traits);
        }
        return this.normalizeLegacyTraits(userContext.traits);
    }

    private normalizeLegacyTraits(legacy: Record<string, string> | TraitValueMap | null | undefined): TraitValueMap {
        if (!legacy || typeof legacy !== 'object') {
            return {};
        }

        const normalized: TraitValueMap = {};
        for (const [key, rawValue] of Object.entries(legacy)) {
            const values = Array.isArray(rawValue) ? rawValue : [rawValue];
            const cleanValues = values
                .map(value => String(value).trim())
                .filter(Boolean);
            if (cleanValues.length > 0) {
                normalized[key] = Array.from(new Set(cleanValues));
            }
        }
        return sanitizeTraitMap(normalized);
    }

    private async listDocuments<T>(prefix: string): Promise<T[]> {
        const results: T[] = [];
        let cursor: string | undefined;
        do {
            const batch = await this.r2.list({ prefix, cursor, limit: 1000 });
            const docs = await Promise.all(
                batch.objects.map(object => r2GetJson<T>(this.r2, object.key)),
            );
            for (const doc of docs) {
                if (doc !== null) {
                    results.push(doc as T);
                }
            }
            cursor = batch.truncated ? batch.cursor : undefined;
        } while (cursor);
        return results;
    }
}
