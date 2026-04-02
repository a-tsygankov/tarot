import { createAppServices } from './app/composition-root.js';
import { restoreTheme } from './ui/styles/themes.js';

// Register all Lit components
import './ui/components/tarot-app.js';

/**
 * Application entry point.
 * Creates all services via DI and mounts the UI.
 */
async function init() {
    // Restore user's theme before first paint
    restoreTheme();

    const services = createAppServices();

    // Log session start (fire-and-forget)
    services.apiService.logSessionAsync();

    // Check version compatibility
    const compat = await services.compatibilityService.checkAsync();
    if (compat.status === 'incompatible') {
        console.warn('Client incompatible:', compat.message);
    } else if (compat.status === 'update_available') {
        console.info('Update available:', compat.message);
    }

    // Mount the app shell
    const appEl = document.createElement('tarot-app');
    (appEl as any).setServices(services);

    const container = document.getElementById('app');
    if (container) {
        container.innerHTML = '';
        container.appendChild(appEl);
    }

    console.log('Tarot Oracle initialized', {
        version: services.config.version,
        uid: services.userContext.uid,
        session: services.userContext.sessionId,
        sttAvailable: services.sttService.isAvailable(),
        ttsAvailable: services.ttsService.isAvailable(),
    });
}

init().catch(console.error);
