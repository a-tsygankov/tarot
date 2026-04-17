import type { UserDocument } from '@shared/contracts/entity-contracts.js';
import { WORKER_CONFIG } from '../config.js';
import { r2GetJson, r2PutJson } from '../services/r2-adapter.js';
import { sanitizeUserText } from '../services/prompt-safety.js';

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
            name?: string | null;
            gender?: string | null;
            birthdate?: string | null;
            location?: string | null;
            userTraitsId?: string | null;
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
            if (update.name !== undefined) existing.name = sanitizeUserText(update.name, 120);
            if (update.gender !== undefined) existing.gender = sanitizeUserText(update.gender, 60);
            if (update.birthdate !== undefined) existing.birthdate = sanitizeUserText(update.birthdate, 60);
            if (update.location !== undefined) existing.locations.lastCity = sanitizeUserText(update.location, 120);
            if (update.userTraitsId !== undefined) existing.userTraitsId = update.userTraitsId;
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
            name: sanitizeUserText(update.name, 120),
            gender: sanitizeUserText(update.gender, 60),
            birthdate: sanitizeUserText(update.birthdate, 60),
            userTraitsId: update.userTraitsId ?? null,
            stats: { totalReadings: 0, totalFollowUps: 0 },
            preferences: {
                language: update.language ?? 'ENG',
                tone: update.tone ?? 'Mystical',
            },
            locations: {
                lastCountry: update.country ?? null,
                lastCity: sanitizeUserText(update.location, 120) ?? update.city ?? null,
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

    async applyContextDelta(uid: string, update: {
        name?: string | null;
        gender?: string | null;
        birthdate?: string | null;
        location?: string | null;
    }): Promise<void> {
        const doc = await this.get(uid);
        if (!doc) {
            return;
        }

        const name = sanitizeUserText(update.name, 120);
        const gender = sanitizeUserText(update.gender, 60);
        const birthdate = sanitizeUserText(update.birthdate, 60);
        const location = sanitizeUserText(update.location, 120);

        if (name) doc.name = name;
        if (gender) doc.gender = gender;
        if (birthdate) doc.birthdate = birthdate;
        if (location) {
            doc.locations.lastCity = location;
        }

        doc.etagVersion += 1;
        await r2PutJson(this.r2, this.key(uid), doc);
    }
}
