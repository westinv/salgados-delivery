// sw.js - Service Worker para PWA
const CACHE_NAME = 'salgados-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/js/app.js'
];

// Instalação - cacheia arquivos estáticos
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache aberto');
                return cache.addAll(urlsToCache);
            })
    );
    // Ativa imediatamente
    self.skipWaiting();
});

// Ativação - limpa caches antigos
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Removendo cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Assume controle imediatamente
    self.clients.claim();
});

// Fetch - estratégia Network First com fallback para cache
self.addEventListener('fetch', event => {
    // Ignora requisições para API (sempre vai para rede)
    if (event.request.url.includes('/api/') || event.request.url.includes('/auth/')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Clona a resposta para cachear
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseClone);
                        });
                }
                return response;
            })
            .catch(() => {
                // Offline - busca no cache
                return caches.match(event.request)
                    .then(response => {
                        if (response) {
                            return response;
                        }
                        // Retorna página offline se disponível
                        return caches.match('/index.html');
                    });
            })
    );
});
