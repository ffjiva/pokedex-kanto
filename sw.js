/* ================================================================
   SERVICE WORKER — POKEDEX KANTO
   Guarda en caché todo lo que la app descarga para que funcione
   sin internet después de la primera carga.
   ================================================================ */

const CACHE_NOMBRE = 'pokedex-kanto-v1';

// Archivos estáticos que se guardan al instalar el SW
const ARCHIVOS_INICIALES = [
    './index.html',
    'https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Outfit:wght@300;400;600;700;900&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css'
];

/* ── Instalación: guarda los archivos base ── */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NOMBRE).then(cache => {
            // Guardamos los archivos iniciales, ignorando fallos individuales
            return Promise.allSettled(
                ARCHIVOS_INICIALES.map(url =>
                    cache.add(url).catch(() => {}) // si alguno falla, continúa
                )
            );
        }).then(() => self.skipWaiting())
    );
});

/* ── Activación: limpia cachés viejas ── */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_NOMBRE)
                    .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

/* ── Fetch: estrategia según tipo de petición ── */
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Para la PokéAPI: primero intenta red, si falla usa caché
    if (url.hostname === 'pokeapi.co') {
        event.respondWith(
            fetch(event.request)
                .then(respuesta => {
                    // Si la respuesta es válida, la guarda en caché y la devuelve
                    if (respuesta && respuesta.status === 200) {
                        const copia = respuesta.clone();
                        caches.open(CACHE_NOMBRE).then(cache => cache.put(event.request, copia));
                    }
                    return respuesta;
                })
                .catch(() => {
                    // Sin internet: devuelve lo que hay en caché
                    return caches.match(event.request);
                })
        );
        return;
    }

    // Para sprites de GitHub (imágenes de los Pokémon)
    if (url.hostname === 'raw.githubusercontent.com') {
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) return cached; // Si ya está en caché, la usa directamente

                // Si no, la descarga, la guarda y la devuelve
                return fetch(event.request)
                    .then(respuesta => {
                        if (respuesta && respuesta.status === 200) {
                            const copia = respuesta.clone();
                            caches.open(CACHE_NOMBRE).then(cache => cache.put(event.request, copia));
                        }
                        return respuesta;
                    })
                    .catch(() => caches.match(event.request));
            })
        );
        return;
    }

    // Para todo lo demás (fuentes, iconos, el propio HTML):
    // Primero caché, si no hay entonces red
    event.respondWith(
        caches.match(event.request).then(cached => {
            return cached || fetch(event.request).then(respuesta => {
                if (respuesta && respuesta.status === 200) {
                    const copia = respuesta.clone();
                    caches.open(CACHE_NOMBRE).then(cache => cache.put(event.request, copia));
                }
                return respuesta;
            });
        })
    );
});
