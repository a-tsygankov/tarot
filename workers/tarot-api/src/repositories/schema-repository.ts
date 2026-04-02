import type {
    ActiveSchemaDocument,
    SchemaVersionDescriptor,
    MigrationManifest,
} from '@shared/contracts/entity-contracts.js';
import { r2GetJson, r2PutJson } from '../services/r2-adapter.js';

const ACTIVE_KEY = 'schemas/active.json';
const VERSIONS_PREFIX = 'schemas/versions';
const MANIFESTS_PREFIX = 'schemas/manifests';

export class R2SchemaRepository {
    constructor(private r2: R2Bucket) {}

    // ── Active schema ───────────────────────────────────────────────

    async getActive(): Promise<ActiveSchemaDocument | null> {
        return r2GetJson<ActiveSchemaDocument>(this.r2, ACTIVE_KEY);
    }

    async setActive(doc: ActiveSchemaDocument): Promise<void> {
        await r2PutJson(this.r2, ACTIVE_KEY, doc);
    }

    // ── Version descriptors ─────────────────────────────────────────

    async getVersionDescriptor(version: string): Promise<SchemaVersionDescriptor | null> {
        return r2GetJson<SchemaVersionDescriptor>(
            this.r2,
            `${VERSIONS_PREFIX}/${version}.json`,
        );
    }

    async putVersionDescriptor(desc: SchemaVersionDescriptor): Promise<void> {
        await r2PutJson(this.r2, `${VERSIONS_PREFIX}/${desc.version}.json`, desc);
    }

    async listVersions(): Promise<string[]> {
        const list = await this.r2.list({ prefix: `${VERSIONS_PREFIX}/` });
        return list.objects.map(o =>
            o.key.replace(`${VERSIONS_PREFIX}/`, '').replace('.json', ''),
        );
    }

    // ── Migration manifests ─────────────────────────────────────────

    async getManifest(manifestId: string): Promise<MigrationManifest | null> {
        return r2GetJson<MigrationManifest>(
            this.r2,
            `${MANIFESTS_PREFIX}/${manifestId}.json`,
        );
    }

    async putManifest(manifest: MigrationManifest): Promise<void> {
        await r2PutJson(
            this.r2,
            `${MANIFESTS_PREFIX}/${manifest.manifestId}.json`,
            manifest,
        );
    }

    async getLatestManifest(): Promise<MigrationManifest | null> {
        const list = await this.r2.list({
            prefix: `${MANIFESTS_PREFIX}/`,
            limit: 100,
        });
        if (list.objects.length === 0) return null;

        // Sort by key (timestamp-based IDs) descending
        const sorted = list.objects.sort((a, b) => b.key.localeCompare(a.key));
        return r2GetJson<MigrationManifest>(this.r2, sorted[0].key);
    }
}
