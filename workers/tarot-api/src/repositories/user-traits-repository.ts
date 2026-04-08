import type { UserTraitsPayload, TraitValueMap } from '@shared/contracts/api-contracts.js';
import type { UserTraitsDocument } from '@shared/contracts/entity-contracts.js';
import { WORKER_CONFIG } from '../config.js';
import { r2GetJson, r2PutJson } from '../services/r2-adapter.js';
import { mergeTraitMaps, sanitizeTraitMap } from '../services/prompt-safety.js';

const PREFIX = 'entities/user-traits';

export class R2UserTraitsRepository {
    constructor(private readonly r2: R2Bucket) {}

    private idForUser(userId: string): string {
        return `traits-${userId}`;
    }

    private keyById(id: string): string {
        return `${PREFIX}/${id}.json`;
    }

    private keyByUserId(userId: string): string {
        return this.keyById(this.idForUser(userId));
    }

    async getByUserId(userId: string): Promise<UserTraitsDocument | null> {
        return r2GetJson<UserTraitsDocument>(this.r2, this.keyByUserId(userId));
    }

    async ensureForUser(userId: string): Promise<UserTraitsDocument> {
        const existing = await this.getByUserId(userId);
        if (existing) {
            return existing;
        }

        const now = new Date().toISOString();
        const doc: UserTraitsDocument = {
            type: 'user-traits',
            schemaVersion: WORKER_CONFIG.schemaVersion,
            id: this.idForUser(userId),
            userId,
            traits: {},
            createdAt: now,
            updatedAt: now,
        };
        await r2PutJson(this.r2, this.keyById(doc.id), doc);
        return doc;
    }

    async mergeForUser(userId: string, traits: TraitValueMap | null | undefined): Promise<UserTraitsDocument> {
        const doc = await this.ensureForUser(userId);
        const mergedTraits = mergeTraitMaps(doc.traits, traits);
        doc.traits = mergedTraits;
        doc.updatedAt = new Date().toISOString();
        doc.schemaVersion = WORKER_CONFIG.schemaVersion;
        await r2PutJson(this.r2, this.keyById(doc.id), doc);
        return doc;
    }

    async replaceForUser(userId: string, traits: TraitValueMap | null | undefined): Promise<UserTraitsDocument> {
        const doc = await this.ensureForUser(userId);
        doc.traits = sanitizeTraitMap(traits);
        doc.updatedAt = new Date().toISOString();
        doc.schemaVersion = WORKER_CONFIG.schemaVersion;
        await r2PutJson(this.r2, this.keyById(doc.id), doc);
        return doc;
    }

    toPayload(doc: UserTraitsDocument | null): UserTraitsPayload | null {
        if (!doc) {
            return null;
        }

        return {
            id: doc.id,
            userId: doc.userId,
            traits: sanitizeTraitMap(doc.traits),
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
        };
    }
}
