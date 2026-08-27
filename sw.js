const CACHE_NAME = 'fanbridge-v1';
const ASSETS_TO_CACHE = [
    './',
    './manifest.json'
];

// Install - cache assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching assets');
                return Promise.all(
                    ASSETS_TO_CACHE.map(url => 
                        cache.add(url).catch(err => {
                            console.log('[SW] Failed to cache:', url, err);
                            return Promise.resolve();
                        })
                    )
                );
            })
    );
    self.skipWaiting();
});

// Activate - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch - serve from cache or network
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests and non-HTTP requests (like chrome-extension://)
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith('http')) return;
    
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                
                return fetch(event.request)
                    .then((networkResponse) => {
                        if (!networkResponse || networkResponse.status !== 200) {
                            return networkResponse;
                        }
                        
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                        
                        return networkResponse;
                    })
                    .catch(() => {
                        if (event.request.mode === 'navigate') {
                            return caches.match('./');
                        }
                        return new Response('Offline', { status: 503 });
                    });
            })
    );
});