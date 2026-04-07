import type { AppConfig } from '../../app/config.js';
import { buildPiperRuntimeUrls, buildPiperWarmCacheUrls } from './piper-assets.js';

interface PiperServiceWorkerMessage {
    type: 'piper:warm-cache';
    urls: string[];
}

export async function registerPiperServiceWorker(config: AppConfig, voiceId: string | null): Promise<void> {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    try {
        const registration = await navigator.serviceWorker.register(config.tts.piper.serviceWorkerPath, {
            scope: import.meta.env.BASE_URL,
        });

        const urls = [
            `${trimTrailingSlash(config.tts.piper.assetBase)}/piper/manifest.json`,
            ...buildPiperRuntimeUrls(config),
            ...buildPiperWarmCacheUrls(config, voiceId),
        ];

        const postWarmCache = () => {
            const message: PiperServiceWorkerMessage = {
                type: 'piper:warm-cache',
                urls,
            };
            registration.active?.postMessage(message);
            registration.waiting?.postMessage(message);
            registration.installing?.postMessage(message);
        };

        if (registration.active || registration.waiting || registration.installing) {
            postWarmCache();
        } else {
            navigator.serviceWorker.addEventListener('controllerchange', postWarmCache, { once: true });
        }
    } catch (error) {
        console.warn('Failed to register Piper service worker', error);
    }
}

function trimTrailingSlash(value: string): string {
    return value.replace(/\/+$/, '');
}
