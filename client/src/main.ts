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

    // Restore user's preferences before first paint
    restoreTheme();
    await initDeckStyle();

    // Restore italic preference
    const italic = localStorage.getItem('tarot-italic') ?? 'true';
    document.documentElement.style.setProperty('--font-reading-style', italic === 'true' ? 'italic' : 'normal');

    // Restore font size preference
    const fontSize = localStorage.getItem('tarot-font-size') ?? 'medium';
    const fontSizeMap: Record<string, string> = { small: '0.85em', medium: '1em', large: '1.15em', xlarge: '1.3em' };
    document.documentElement.style.setProperty('--font-reading-size', fontSizeMap[fontSize] ?? '1em');

    const services = createAppServices();

    // Populate UserContext with IP geo data when available (non-blocking)
    services.geoService.fetchIpGeo().then(geo => {
        if (geo) {
            services.userContext.ip = geo.ip;
            services.userContext.ipCity = geo.city;
            services.userContext.ipCountry = geo.country;
        }
    }).catch(() => {});

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
