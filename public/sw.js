const CACHE_NAME = 'biptach-v1';

// Install: skip waiting to activate immediately
self.addEventListener('install', event => {
  self.skipWaiting();
});

// Activate: clean up old caches and claim all clients
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first with cache fallback, cache all successful responses
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip Supabase API calls
  if (event.request.url.includes('supabase.co')) return;

  // For navigation requests (page loads, SPA routes), always serve index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Update cache with fresh copy
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put('/index.html', responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline: serve cached index.html for any route
          return caches.match('/index.html').then(response => {
            return response || new Response('Biptach is offline. Please connect to the internet.', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/html' }
            });
          });
        })
    );
    return;
  }

  // For all other assets (JS, CSS, images), use network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clone and cache successful responses
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then(response => {
          return response || new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
  );
});
