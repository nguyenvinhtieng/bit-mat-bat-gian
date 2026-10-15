// Cache-first for /assets/* out of the bucket the loading screen fills (src/preload.ts).
// The bucket name carries the asset-list version (?v=), so a new deploy with changed
// assets registers a new worker that drops the old bucket on activate.
const CACHE = 'tht-assets-' + new URL(self.location.href).searchParams.get('v');

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k.startsWith('tht-assets-') && k !== CACHE) await caches.delete(k);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith('/assets/')) return;
  if (req.headers.has('range')) return; // media range requests: let the browser handle them
  e.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(url.pathname);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') cache.put(url.pathname, res.clone());
      return res;
    })(),
  );
});
