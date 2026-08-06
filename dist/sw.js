const CACHE_NAME = 'biptach-v1';

// Install: cache all critical assets immediately
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        // Fetch the root page to discover all assets
        const response = await fetch('/');
        if (response.ok) {
          const html = await response.text();
          
          // Extract all script and link tags
          const scriptMatches = html.match(/src="([^"]+\.js)"/g) || [];
          const linkMatches = html.match(/href="([^"]+\.css)"/g) || [];
          
          const urlsToCache = ['/'];
          
          scriptMatches.forEach(match => {
            const url = match.match(/src="([^"]+)"/);
            if (url && url[1]) urlsToCache.push(url[1]);
          });
          
          linkMatches.forEach(match => {
            const url = match.match(/href="([^"]+)"/);
            if (url && url[1]) urlsToCache.push(url[1]);
          });
          
          // Cache all discovered assets
          await Promise.all(
            urlsToCache.map(url => 
              cache.add(url).catch(err => console.warn('Failed to cache:', url, err))
            )
          );
          
          console.log('Service worker cached', urlsToCache.length, 'assets');
        }
      } catch (err) {
        console.error('Service worker install failed:', err);
      }
    })
  );
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
          if (response) {
            return response;
          }
          
          // For navigation requests, try to serve index.html from cache
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          
          // For other requests, return offline response
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
  );
});
