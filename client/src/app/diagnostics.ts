/**
 * Startup diagnostics — logs a rich boot report to the console.
 * Visible both in browser DevTools and the in-app debug console.
 */

import type { AppServices } from './composition-root.js';
import type { VersionResponse } from '@shared/contracts/api-contracts.js';
import { getCurrentDeckStyle } from '../ui/components/card-art-registry.js';

interface HealthCheck {
    name: string;
    status: 'ok' | 'warn' | 'fail';
    detail: string;
    durationMs?: number;
    serverVersion?: VersionResponse;
}

/**
 * Run all startup diagnostics and log results.
 * Call after services are created and deck style is initialized.
 */
export async function runDiagnostics(services: AppServices, bootStartMs: number): Promise<void> {
    const { config, userContext, sttService, ttsService } = services;

    // ── Banner ──
    const buildTime = import.meta.env.VITE_BUILD_TIME ?? 'dev';
    console.log(
        '%c✦ Tarot Oracle v' + config.version + ' ✦',
        'color: #c9a84c; font-size: 14px; font-weight: bold; text-shadow: 0 0 8px rgba(201,168,76,0.4);'
    );
    console.log(`Client: v${config.version} (build: ${buildTime}) | API target: ${config.apiBase || 'local proxy'} (api v${config.apiVersion})`);

    // ── Health checks (run in parallel) ──
    const [apiCheck, ...otherChecks] = await Promise.all([
        checkApi(services),
        checkLocalStorage(),
        checkTts(ttsService),
        checkStt(sttService),
    ]);
    const checks = [apiCheck, ...otherChecks];

    console.group('Health checks');
    for (const c of checks) {
        const icon = c.status === 'ok' ? '✅' : c.status === 'warn' ? '⚠️' : '❌';
        const timing = c.durationMs != null ? ` (${c.durationMs}ms)` : '';
        const method = c.status === 'fail' ? 'warn' : 'log';
        console[method](`${icon} ${c.name}: ${c.detail}${timing}`);
    }
    // Show worker version if API check succeeded
    if (apiCheck.serverVersion) {
        console.log(
            `Client: v${config.version} | Worker: v${apiCheck.serverVersion.worker.version} | Schema: ${apiCheck.serverVersion.schema.current}`,
        );
    }
    console.groupEnd();

    // ── User context ──
    console.group('User context');
    console.log(`UID: ${userContext.uid}`);
    console.log(`Session: ${userContext.sessionId}`);
    console.log(`Language: ${userContext.language} | Tone: ${userContext.tone}`);
    if (userContext.name) console.log(`Name: ${userContext.name}`);
    if (userContext.gender) console.log(`Gender: ${userContext.gender}`);
    if (userContext.birthdate) console.log(`Birthdate: ${userContext.birthdate}`);
    if (userContext.location) console.log(`Location: ${userContext.location}`);
    console.log(`Total readings: ${userContext.totalReadings}`);
    console.log(`Device: ${userContext.deviceInfo?.platform ?? 'unknown'} | ${userContext.deviceInfo?.screenWidth}×${userContext.deviceInfo?.screenHeight}`);
    // Show accumulated traits
    const traitEntries = Object.entries(userContext.traits);
    if (traitEntries.length > 0) {
        console.group('Known traits');
        for (const [key, value] of traitEntries) {
            console.log(`${key.replace(/_/g, ' ')}: ${value}`);
        }
        console.groupEnd();
    } else {
        console.log('Traits: none yet (model extracts from your questions)');
    }
    console.groupEnd();

    // ── Preferences ──
    console.group('Preferences');
    console.log(`Theme: ${localStorage.getItem('tarot-theme') ?? 'dusk'}`);
    console.log(`Deck: ${getCurrentDeckStyle()}`);
    console.log(`Font: ${localStorage.getItem('tarot-font') ?? 'Palatino'}${(localStorage.getItem('tarot-italic') ?? 'true') === 'true' ? ' (italic)' : ''}`);
    console.log(`TTS speed: ${localStorage.getItem('tarot-tts-speed') ?? '1.0'}×`);
    console.log(`Voice preference: ${userContext.voicePreference}`);
    console.groupEnd();

    // ── Geo (passive) ──
    const geo = services.geoService;
    console.log(`Geo (passive): ${geo.toSummary()}`);

    // ── Boot timing ──
    const bootMs = Math.round(performance.now() - bootStartMs);
    console.log(`Boot completed in ${bootMs}ms`);
}

// ── Individual checks ──

async function checkApi(services: AppServices): Promise<HealthCheck> {
    const t0 = performance.now();
    try {
        const result = await services.compatibilityService.checkAsync();
        const ms = Math.round(performance.now() - t0);
        const sv = result.serverVersion;
        if (result.status === 'ok') {
            return { name: 'API', status: 'ok', detail: 'reachable, compatible', durationMs: ms, serverVersion: sv };
        } else if (result.status === 'update_available') {
            return { name: 'API', status: 'warn', detail: `update available: ${result.message}`, durationMs: ms, serverVersion: sv };
        } else if (result.status === 'incompatible') {
            return { name: 'API', status: 'fail', detail: `incompatible: ${result.message}`, durationMs: ms, serverVersion: sv };
        } else {
            return { name: 'API', status: 'warn', detail: `${result.status}: ${result.message ?? 'unknown'}`, durationMs: ms };
        }
    } catch (err) {
        const ms = Math.round(performance.now() - t0);
        return { name: 'API', status: 'fail', detail: `unreachable — ${(err as Error).message}`, durationMs: ms };
    }
}

async function checkLocalStorage(): Promise<HealthCheck> {
    try {
        const key = '__diag_test__';
        localStorage.setItem(key, '1');
        localStorage.removeItem(key);
        return { name: 'LocalStorage', status: 'ok', detail: 'writable' };
    } catch {
        return { name: 'LocalStorage', status: 'fail', detail: 'blocked or full' };
    }
}

async function checkTts(tts: { isAvailable(): boolean }): Promise<HealthCheck> {
    const available = tts.isAvailable();
    return {
        name: 'TTS',
        status: available ? 'ok' : 'warn',
        detail: available ? 'available' : 'not available',
    };
}

async function checkStt(stt: { isAvailable(): boolean }): Promise<HealthCheck> {
    const available = stt.isAvailable();
    return {
        name: 'STT',
        status: available ? 'ok' : 'warn',
        detail: available ? 'available (Web Speech API)' : 'not available (no browser support)',
    };
}
