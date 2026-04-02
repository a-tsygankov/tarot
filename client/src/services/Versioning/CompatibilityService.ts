import type { IApiService } from '../IApiService.js';
import type { VersionResponse } from '@shared/contracts/api-contracts.js';

export type CompatibilityStatus = 'ok' | 'update_available' | 'incompatible' | 'error';

export interface CompatibilityResult {
    status: CompatibilityStatus;
    serverVersion?: VersionResponse;
    message?: string;
}

/**
 * Checks client/worker/schema compatibility on app load.
 */
export class CompatibilityService {
    constructor(
        private readonly apiService: IApiService,
        private readonly clientVersion: string,
    ) {}

    async checkAsync(): Promise<CompatibilityResult> {
        try {
            const server = await this.apiService.checkVersionAsync();

            if (server.maintenanceMode) {
                return { status: 'incompatible', serverVersion: server, message: 'Service is in maintenance mode' };
            }

            if (server.compatibility.status === 'incompatible') {
                return { status: 'incompatible', serverVersion: server, message: 'Client version not supported' };
            }

            if (this.isVersionLessThan(this.clientVersion, server.app.latest)) {
                return { status: 'update_available', serverVersion: server, message: 'Update available' };
            }

            return { status: 'ok', serverVersion: server };
        } catch {
            return { status: 'error', message: 'Could not reach server' };
        }
    }

    private isVersionLessThan(a: string, b: string): boolean {
        const pa = a.split('.').map(Number);
        const pb = b.split('.').map(Number);
        for (let i = 0; i < 3; i++) {
            if ((pa[i] ?? 0) < (pb[i] ?? 0)) return true;
            if ((pa[i] ?? 0) > (pb[i] ?? 0)) return false;
        }
        return false;
    }
}
