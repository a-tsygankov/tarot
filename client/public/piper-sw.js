const CACHE_NAME = 'tarot-piper-assets-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'piper:warm-cache' || !Array.isArray(data.urls)) {
    return;
  }

  event.waitUntil(warmCache(data.urls));
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (!url.pathname.includes('/piper/') && !url.pathname.endsWith('/piper/manifest.json')) {
    return;
  }

  event.respondWith(cacheFirst(event.request));
});

async function warmCache(urls) {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(urls.map(async (url) => {
    try {
      const request = new Request(url, { credentials: 'same-origin' });
      const response = await fetch(request);
      if (response.ok) {
        await cache.put(request, response.clone());
      }
    } catch {
      // Ignore warmup failures; runtime fetch still handles misses.
    }
  }));
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}
