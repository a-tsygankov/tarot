import type { Env } from '../env.js';
import { WORKER_CONFIG } from '../config.js';
import type { VersionResponse } from '@shared/contracts/api-contracts.js';

/**
 * GET /api/meta/version — returns current system compatibility info.
 */
export async function handleVersion(_request: Request, env: Env): Promise<Response> {
    // Read active schema from R2
    let schemaVersion: string = WORKER_CONFIG.schemaVersion;
    let manifestId = 'none';

    try {
        const active = await env.R2.get('schemas/active.json');
        if (active) {
            const doc = await active.json() as { schemaVersion: string };
            schemaVersion = doc.schemaVersion;
        }
    } catch {
        // Use default from config
    }

    try {
        const manifests = await env.R2.list({ prefix: 'manifests/', limit: 1 });
        if (manifests.objects.length > 0) {
            manifestId = manifests.objects[0].key.replace('manifests/', '').replace('.json', '');
        }
    } catch {
        // No manifests yet
    }

    const response: VersionResponse = {
        app: {
            latest: WORKER_CONFIG.version,
            minimumSupported: WORKER_CONFIG.minClientVersion,
        },
        api: {
            current: WORKER_CONFIG.apiVersion,
            supported: [...WORKER_CONFIG.supportedApiVersions],
        },
        worker: {
            version: WORKER_CONFIG.version,
        },
        schema: {
            current: schemaVersion,
        },
        manifest: {
            id: manifestId,
        },
        compatibility: {
            status: 'ok',
        },
        maintenanceMode: false,
    };

    return Response.json(response);
}
