const CACHE_NAME = 'mundo-onirico-assets-v1';
const CDN_PATTERNS = ['cdn.tailwindcss.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.map(n => {
        if (n !== CACHE_NAME) return caches.delete(n);
      }))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isCDN = CDN_PATTERNS.some(p => url.hostname.includes(p));
  if (isCDN && event.request.method === 'GET') {
    event.respondWith(networkFirst(event.request));
  }
});

async function networkFirst(request) {
  try {
    const res = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, res.clone());
    return res;
  } catch {
    return caches.match(request);
  }
}