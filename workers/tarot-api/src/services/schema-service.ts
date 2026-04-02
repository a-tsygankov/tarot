import type {
    ActiveSchemaDocument,
    SchemaVersionDescriptor,
    SchemaChange,
    MigrationManifest,
    BaseDocument,
} from '@shared/contracts/entity-contracts.js';
import { R2SchemaRepository } from '../repositories/schema-repository.js';
import { WORKER_CONFIG } from '../config.js';

/**
 * Schema activation, validation, and lazy migration logic.
 */
export class SchemaService {
    constructor(private repo: R2SchemaRepository) {}

    /**
     * Ensure schemas/active.json exists. Called once on first deploy.
     */
    async ensureInitialized(): Promise<ActiveSchemaDocument> {
        const existing = await this.repo.getActive();
        if (existing) return existing;

        const initial: ActiveSchemaDocument = {
            schemaVersion: WORKER_CONFIG.schemaVersion,
            compatibilityApiMin: WORKER_CONFIG.apiVersion,
            compatibilityApiMax: WORKER_CONFIG.apiVersion,
            activatedAt: new Date().toISOString(),
            sourceSchemaVersion: null,
            status: 'active',
        };
        await this.repo.setActive(initial);
        return initial;
    }

    /**
     * Activate a new schema version. Returns the new active document.
     */
    async activate(
        newVersion: string,
        descriptor: SchemaVersionDescriptor,
    ): Promise<ActiveSchemaDocument> {
        const current = await this.repo.getActive();
        const previousVersion = current?.schemaVersion ?? null;

        // Store the version descriptor
        await this.repo.putVersionDescriptor(descriptor);

        // Update active schema
        const active: ActiveSchemaDocument = {
            schemaVersion: newVersion,
            compatibilityApiMin: WORKER_CONFIG.apiVersion,
            compatibilityApiMax: WORKER_CONFIG.apiVersion,
            activatedAt: new Date().toISOString(),
            sourceSchemaVersion: previousVersion,
            status: 'active',
        };
        await this.repo.setActive(active);
        return active;
    }

    /**
     * Rollback to the previous schema version.
     */
    async rollback(): Promise<ActiveSchemaDocument | null> {
        const current = await this.repo.getActive();
        if (!current?.sourceSchemaVersion) return null;

        const rollbackDoc: ActiveSchemaDocument = {
            schemaVersion: current.sourceSchemaVersion,
            compatibilityApiMin: current.compatibilityApiMin,
            compatibilityApiMax: current.compatibilityApiMax,
            activatedAt: new Date().toISOString(),
            sourceSchemaVersion: current.schemaVersion,
            status: 'rollback',
        };
        await this.repo.setActive(rollbackDoc);
        return rollbackDoc;
    }

    /**
     * Lazy-migrate a single document to the current schema version.
     * Returns the migrated document (or original if already current).
     */
    async lazyMigrate<T extends BaseDocument>(doc: T): Promise<T> {
        const active = await this.repo.getActive();
        if (!active || doc.schemaVersion === active.schemaVersion) {
            return doc;
        }

        // Get version descriptor to find changes
        const descriptor = await this.repo.getVersionDescriptor(active.schemaVersion);
        if (!descriptor || descriptor.migrationStrategy === 'none') {
            // Just stamp the version, no structural changes
            return { ...doc, schemaVersion: active.schemaVersion };
        }

        // Apply changes relevant to this document type
        const migrated = { ...doc } as Record<string, unknown>;
        for (const change of descriptor.changes) {
            if (change.entity !== doc.type) continue;
            applyChange(migrated, change);
        }
        migrated.schemaVersion = active.schemaVersion;
        return migrated as T;
    }

    /**
     * Get the current active schema version string.
     */
    async getCurrentVersion(): Promise<string> {
        const active = await this.repo.getActive();
        return active?.schemaVersion ?? WORKER_CONFIG.schemaVersion;
    }

    /**
     * Generate a new version ID in YYYY.MM.DD-NN format.
     */
    async generateVersionId(): Promise<string> {
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
        const versions = await this.repo.listVersions();

        // Find existing versions for today
        const todayVersions = versions.filter(v => v.startsWith(today));
        const nextSeq = todayVersions.length + 1;
        const seq = String(nextSeq).padStart(2, '0');

        return `${today}-${seq}`;
    }

    /**
     * Create a migration manifest for batch processing.
     */
    async createManifest(
        fromVersion: string,
        toVersion: string,
        totalDocuments: number,
    ): Promise<MigrationManifest> {
        const manifest: MigrationManifest = {
            manifestId: `migrate-${fromVersion}-to-${toVersion}-${Date.now()}`,
            fromVersion,
            toVersion,
            startedAt: new Date().toISOString(),
            completedAt: null,
            status: 'running',
            totalDocuments,
            processedDocuments: 0,
            failedDocuments: 0,
            errors: [],
        };
        await this.repo.putManifest(manifest);
        return manifest;
    }

    /**
     * Update manifest progress and persist.
     */
    async updateManifestProgress(
        manifest: MigrationManifest,
        processed: number,
        failed: number,
        errors: Array<{ key: string; error: string }>,
    ): Promise<void> {
        manifest.processedDocuments = processed;
        manifest.failedDocuments = failed;
        manifest.errors.push(...errors);

        if (processed + failed >= manifest.totalDocuments) {
            manifest.completedAt = new Date().toISOString();
            manifest.status = failed > 0 ? 'failed' : 'completed';
        }

        await this.repo.putManifest(manifest);
    }
}

// ── Private helpers ─────────────────────────────────────────────────

function applyChange(doc: Record<string, unknown>, change: SchemaChange): void {
    switch (change.changeType) {
        case 'add_field':
            if (!(change.field in doc)) {
                doc[change.field] = change.defaultValue ?? null;
            }
            break;
        case 'remove_field':
            delete doc[change.field];
            break;
        case 'rename_field': {
            // description contains the new field name for rename
            const newName = change.description;
            if (change.field in doc && newName) {
                doc[newName] = doc[change.field];
                delete doc[change.field];
            }
            break;
        }
        // change_type and restructure require custom logic per case
        default:
            break;
    }
}
