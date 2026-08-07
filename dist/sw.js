const CACHE_NAME = 'biptach-v4';

// Static assets to always pre-cache
const STATIC_URLS = [
  '/index.html',
  '/manifest.json',
  '/favicon.svg'
];

// Install: fetch index.html, discover hashed JS/CSS bundles, pre-cache everything
self.addEventListener('install', event => {
  console.log('[SW] Install event fired');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 1. Cache static assets
      console.log('[SW] Pre-caching static assets:', STATIC_URLS);
      await cache.addAll(STATIC_URLS);
      console.log('[SW] Static assets cached');

      // 2. Fetch index.html and extract JS/CSS bundle URLs
      try {
        const indexResponse = await fetch('/index.html');
        const html = await indexResponse.text();

        // Match <script src="/assets/..."> and <link rel="stylesheet" href="/assets/...">
        const assetRegex = /(?:src|href)="(\/assets\/[^"]+)"/g;
        const assetUrls = [];
        let match;
        while ((match = assetRegex.exec(html)) !== null) {
          assetUrls.push(match[1]);
        }

        if (assetUrls.length > 0) {
          console.log('[SW] Discovered bundled assets:', assetUrls);
          await cache.addAll(assetUrls);
          console.log('[SW] Bundled assets cached');
        } else {
          console.warn('[SW] No bundled assets found in index.html');
        }
      } catch (err) {
        console.error('[SW] Failed to discover/cache bundled assets:', err);
      }

      console.log('[SW] All pre-caching complete');
    }).catch(err => {
      console.error('[SW] Pre-caching FAILED entirely:', err);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches and claim all clients
self.addEventListener('activate', event => {
  console.log('[SW] Activate event fired');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      console.log('[SW] Existing caches:', cacheNames);
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
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
