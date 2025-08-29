// sw.js - Service Worker para la aplicación PWA
// Función para obtener el nombre del cache basado en la versión
function getCacheName(version) {
    return `pwa-cache-${version}`;
}

// Definir versiones para control de caché
const CACHE_VERSION = 'v1.0.0';
const CACHE_STATIC_NAME = getCacheName(`static-${CACHE_VERSION}`);
const CACHE_DYNAMIC_NAME = getCacheName(`dynamic-${CACHE_VERSION}`);
const CACHE_INMUTABLE_NAME = getCacheName(`inmutable-${CACHE_VERSION}`);

// Página offline para fallback
const OFFLINE_PAGE = '/offline.html';

// Recursos estáticos propios de la appa
const ASSETS_TO_CACHE_STATIC = [
    '/',
    'favicon.ico',
    '/acceso.html',
    '/layoutadmin.html',
    '/layoutusuario.html',
    '/ExportarMuestra.html',
    '/GrabaMuestra.html',
    '/MantCat.html',
    '/offline.html',
    '/img/icon-192.png',
    '/img/icon-512.png',
    '/img/Inide.png',
    '/Controller/Muestra.js',
    '/Controller/BaseDatos.js',
];

const ASSETS_TO_CACHE_INMUTABLE = [
    '/Content/bootstrap.min.css',
    '/Content/bootstrap-float-label.css',
    '/Content/select2.min.css',
    '/Content/bootstrap-icons.css',
    '/Content/fonts/bootstrap-icons.woff',
    '/Content/fonts/bootstrap-icons.woff2',
    '/Content/alertify/alertify.min.css',
    '/Content/alertify/default.min.css',
    '/Content/alertify/semantic.min.css',
    '/Scripts/bootstrap.bundle.min.js',
    '/Scripts/jquery-3.5.1.min.js',
    '/Scripts/dexie.js',
    '/Scripts/jquery.inputmask.bundle.js',
    '/Scripts/select2.min.js',
    '/Scripts/alertify.min.js',
];

// Instalación del Service Worker y caché de recursos
self.addEventListener('install', event => {
    console.log(`[Service Worker] Installing and caching static and immutable assets: ${CACHE_STATIC_NAME}, ${CACHE_INMUTABLE_NAME}`);
    
    const cacheStatic = caches.open(CACHE_STATIC_NAME)
        .then(cache => cache.addAll(ASSETS_TO_CACHE_STATIC));

    const cacheInmutable = caches.open(CACHE_INMUTABLE_NAME)
        .then(cache => cache.addAll(ASSETS_TO_CACHE_INMUTABLE));

    // Esperar a que ambos caches se completen antes de activar el service worker
    event.waitUntil(Promise.all([cacheStatic, cacheInmutable]));
    self.skipWaiting(); // Forzar activación inmediata tras instalación
});

// Función que facilita la activación y limpieza de caches viejas comparadas con la versión actual
function clearOldCaches(currentCacheNames) {
    return caches.keys().then(cacheNames => {
        return Promise.all(
            cacheNames.map(cacheName => {
                if (!currentCacheNames.includes(cacheName)) {
                    console.log(`[Service Worker] Deleting old cache: ${cacheName}`);
                    return caches.delete(cacheName);
                }
                return null;
            })
        );
    });
}

// Activación y limpieza de caches antiguas
self.addEventListener('activate', event => {
    console.log(`[Service Worker] Activating service worker and cleaning old caches...`);
    const cacheWhitelist = [CACHE_STATIC_NAME, CACHE_DYNAMIC_NAME, CACHE_INMUTABLE_NAME];
    event.waitUntil(
        clearOldCaches(cacheWhitelist).then(() => self.clients.claim())
    );
});

// Estrategia fetch: Cache First con fallback a red y actualización dinámica de caché
self.addEventListener('fetch', event => {
    //! if (event.request.method !== 'GET') return;
     const url = new URL(event.request.url);
    
    // Helper para identificar solicitudes a la API externa
    const isExternalAPI = () => {
        return url.hostname === 'appcepov.inide.gob.ni' && 
            url.pathname.startsWith('/endpoint/cipp/');
    };

    // Estrategia para APIs externas: Network Only + No cacheo
    if (isExternalAPI()) {
        event.respondWith(
            fetch(event.request)
                .then(networkResponse => {
                    // Validar respuesta exitosa
                    if (!networkResponse.ok) {
                        return networkResponse; // Dejar que el cliente maneje el error
                    }
                    return networkResponse;
                })
                .catch(error => {
                    // Manejo de errores de red para APIs
                    if (event.request.mode === 'navigate') {
                        return caches.match(OFFLINE_PAGE);
                    }
                    return new Response(JSON.stringify({
                        error: 'network-error',
                        message: 'Error de conexión',
                        status: error.status || 503
                    }), {                        
                        status: error.status || 503,
                        headers: {'Content-Type': 'application/json'}
                    });
                })
        );
        return;
    }

    // Estrategia original para recursos locales: Cache First
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse; // Devuelve el recurso desde caché
                }

                return fetch(event.request).then(networkResponse => {
                    if (!networkResponse.ok) {
                        if (event.request.mode === 'navigate') {
                            return caches.match(OFFLINE_PAGE);
                        }
                        return networkResponse;
                    }

                    const responseToCache = networkResponse.clone();
                    caches.open(`${CACHE_DYNAMIC_NAME}-${CACHE_VERSION}`).then(cache => {
                        cache.put(event.request, responseToCache);
                    });

                    return networkResponse;
                });
            })
            .catch(() => {
                if (event.request.mode === 'navigate') {
                    return caches.match(OFFLINE_PAGE);
                }
                return new Response(JSON.stringify({
                    error: 'network-error',
                    message: 'Error de conexión'
                }), {
                    status: 503,
                    headers: {'Content-Type': 'application/json'}
                });
            })
    );    
});

// Escuchar el evento 'message' para forzar la actualización
self.addEventListener('message', event => {
    // Verificar el origen del mensaje antes de actuar
    if (event.origin && event.origin !== self.origin) {
        console.warn('[Service Worker] Message origin not trusted:', event.origin);
        return;
    }
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting(); // Forzar la activación del nuevo service worker
    }
});
