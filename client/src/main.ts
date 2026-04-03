import { createAppServices } from './app/composition-root.js';
import { runDiagnostics } from './app/diagnostics.js';
import { restoreTheme } from './ui/styles/themes.js';
import { initDeckStyle } from './ui/components/card-art-registry.js';

// Register all Lit components
import './ui/components/tarot-app.js';

/**
 * Application entry point.
 * Creates all services via DI and mounts the UI.
 */
async function init() {
    const bootStart = performance.now();

    // Restore user's theme and deck style before first paint
    restoreTheme();
    await initDeckStyle();

    const services = createAppServices();

    // Log session start (fire-and-forget)
    services.apiService.logSessionAsync();

    // Mount the app shell
    const appEl = document.createElement('tarot-app');
    (appEl as any).setServices(services);

    const container = document.getElementById('app');
    if (container) {
        container.innerHTML = '';
        container.appendChild(appEl);
    }

    // Run diagnostics (includes API compatibility check)
    await runDiagnostics(services, bootStart);
}

// Guard against HMR re-execution
if (!(window as unknown as Record<string, boolean>).__tarotInitialized) {
    (window as unknown as Record<string, boolean>).__tarotInitialized = true;
    init().catch(console.error);
}
