import { r2GetJson, r2PutJson } from './r2-adapter.js';

/**
 * Maintains materialized R2 indexes that replace SQL queries.
 * Each index is a small JSON array of IDs at a known key path.
 */

interface IndexEntry {
    id: string;
    createdAt: string;
}

export class IndexWriter {
    constructor(private r2: R2Bucket) {}

    /** Add a game to the user's games index. */
    async addUserGame(uid: string, gameId: string): Promise<void> {
        const key = `indexes/user-games/${uid}.json`;
        const entries = await r2GetJson<IndexEntry[]>(this.r2, key) ?? [];
        entries.push({ id: gameId, createdAt: new Date().toISOString() });
        await r2PutJson(this.r2, key, entries);
    }

    /** Add a game to the date index. */
    async addDateGame(date: string, gameId: string): Promise<void> {
        const key = `indexes/date-games/${date}.json`;
        const entries = await r2GetJson<IndexEntry[]>(this.r2, key) ?? [];
        entries.push({ id: gameId, createdAt: new Date().toISOString() });
        await r2PutJson(this.r2, key, entries);
    }

    /** Track active user for a given date (deduplicated). */
    async trackActiveUser(date: string, uid: string): Promise<void> {
        const key = `indexes/active-users/${date}.json`;
        const uids = await r2GetJson<string[]>(this.r2, key) ?? [];
        if (!uids.includes(uid)) {
            uids.push(uid);
            await r2PutJson(this.r2, key, uids);
        }
    }
}
