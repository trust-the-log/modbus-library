const CACHE = 'modbus-library-v1';

// On install: cache the app shell
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll([
      './',
      './index.html',
    ]))
  );
});

// On activate: delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for data JSON, network-first for everything else
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isData = url.pathname.includes('/data/');

  if (isData) {
    // Cache-first: serve from cache, fetch+update in background
    e.respondWith(
      caches.open(CACHE).then(async cache => {
        const cached = await cache.match(e.request);
        const fetchPromise = fetch(e.request)
          .then(res => { if (res.ok) cache.put(e.request, res.clone()); return res; })
          .catch(() => null);
        return cached || fetchPromise;
      })
    );
  } else {
    // Network-first: try network, fall back to cache
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            caches.open(CACHE).then(cache => cache.put(e.request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  }
});
