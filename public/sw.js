const CACHE_NAME = 'c-studio-emception-cache-v1';

const PRECACHE_ASSETS = [
  '/',
  '/emception/emception.js',
  '/emception/emception.worker.js',
  '/emception/brotli/decode.js',
  '/emception/brotli/decode.wasm',
  '/emception/llvm/bin/clang',
  '/emception/llvm/bin/lld',
  '/emception/quicknode/node.js',
];

self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install Event');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching core assets');
      // We don't fail the install if precache fails because Emception fetches it dynamically anyway
      // But we try to put it in cache early.
      return Promise.allSettled(
        PRECACHE_ASSETS.map(url => cache.add(url).catch(e => console.warn('Failed to precache', url, e)))
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate Event');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Intercept Emception requests (WebAssembly blobs, Emscripten JS, etc.)
  if (url.pathname.startsWith('/emception/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[ServiceWorker] Serving from cache:', url.pathname);
          return cachedResponse;
        }

        // Not in cache, fetch from network and cache it for next time
        console.log('[ServiceWorker] Fetching from network:', url.pathname);
        return fetch(event.request).then((networkResponse) => {
          // Check if we received a valid response
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
            console.log('[ServiceWorker] Cached newly fetched resource:', url.pathname);
          });

          return networkResponse;
        }).catch((err) => {
          console.error('[ServiceWorker] Fetch failed for', url.pathname, err);
          // Optional: Return a custom offline fallback if needed
          throw err;
        });
      })
    );
    return;
  }

  // Allow standard next.js routing to happen normally or via next-pwa
});
