import type { UserDocument } from '@shared/contracts/entity-contracts.js';
import { WORKER_CONFIG } from '../config.js';
import { r2GetJson, r2PutJson } from '../services/r2-adapter.js';

const PREFIX = 'entities/users';

export class R2UserRepository {
    constructor(private r2: R2Bucket) {}

    private key(uid: string): string {
        return `${PREFIX}/${uid}.json`;
    }

    async get(uid: string): Promise<UserDocument | null> {
        return r2GetJson<UserDocument>(this.r2, this.key(uid));
    }

    async upsert(
        uid: string,
        update: {
            country?: string | null;
            city?: string | null;
            language?: string;
            tone?: string;
        },
    ): Promise<UserDocument> {
        const now = new Date().toISOString();
        const existing = await this.get(uid);

        if (existing) {
            existing.lastSeenAt = now;
            if (update.country) existing.locations.lastCountry = update.country;
            if (update.city) existing.locations.lastCity = update.city;
            if (update.language) existing.preferences.language = update.language;
            if (update.tone) existing.preferences.tone = update.tone;
            existing.etagVersion += 1;
            await r2PutJson(this.r2, this.key(uid), existing);
            return existing;
        }

        const doc: UserDocument = {
            type: 'user',
            schemaVersion: WORKER_CONFIG.schemaVersion,
            uid,
            firstSeenAt: now,
            lastSeenAt: now,
            name: null,
            gender: null,
            birthdate: null,
            traits: {},
            stats: { totalReadings: 0, totalFollowUps: 0 },
            preferences: {
                language: update.language ?? 'ENG',
                tone: update.tone ?? 'Mystical',
            },
            locations: {
                lastCountry: update.country ?? null,
                lastCity: update.city ?? null,
            },
            etagVersion: 1,
        };
        await r2PutJson(this.r2, this.key(uid), doc);
        return doc;
    }

    async incrementStat(uid: string, stat: 'totalReadings' | 'totalFollowUps'): Promise<void> {
        const doc = await this.get(uid);
        if (!doc) return;
        doc.stats[stat] += 1;
        doc.etagVersion += 1;
        await r2PutJson(this.r2, this.key(uid), doc);
    }
}
