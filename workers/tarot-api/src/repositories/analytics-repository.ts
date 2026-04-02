import type { DailySummary, DailySummaryDelta } from '@shared/contracts/entity-contracts.js';
import { r2GetJson, r2PutJson } from '../services/r2-adapter.js';

const PREFIX = 'analytics/daily';

export class R2AnalyticsRepository {
    constructor(private r2: R2Bucket) {}

    private key(date: string): string {
        return `${PREFIX}/${date}.json`;
    }

    async getDailySummary(date: string): Promise<DailySummary | null> {
        return r2GetJson<DailySummary>(this.r2, this.key(date));
    }

    async incrementDaily(date: string, delta: DailySummaryDelta): Promise<void> {
        const existing = await this.getDailySummary(date);

        if (existing) {
            if (delta.sessions) existing.sessions += delta.sessions;
            if (delta.uniqueUsers) existing.uniqueUsers += delta.uniqueUsers;
            if (delta.readings) existing.readings += delta.readings;
            if (delta.followUps) existing.followUps += delta.followUps;
            if (delta.language) {
                const entry = existing.topLanguages.find(l => l.language === delta.language);
                if (entry) {
                    entry.count += 1;
                } else {
                    existing.topLanguages.push({ language: delta.language, count: 1 });
                }
            }
            await r2PutJson(this.r2, this.key(date), existing);
        } else {
            const doc: DailySummary = {
                date,
                sessions: delta.sessions ?? 0,
                uniqueUsers: delta.uniqueUsers ?? 0,
                readings: delta.readings ?? 0,
                followUps: delta.followUps ?? 0,
                topLanguages: delta.language
                    ? [{ language: delta.language, count: 1 }]
                    : [],
            };
            await r2PutJson(this.r2, this.key(date), doc);
        }
    }
}
