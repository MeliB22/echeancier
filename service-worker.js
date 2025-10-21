// Nom du cache
const CACHE_NAME = 'echeancier-pwa-v1';

// Liste des fichiers à mettre en cache immédiatement (Assets)
const urlsToCache = [
    '/', // L'URL racine, qui correspond à index.html
    '/index.html',
    // Les librairies externes (Tailwind et Montserrat)
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap',
    // Le manifeste doit être inclus
    '/manifest.json' 
    // Si vous aviez une icône personnalisée, elle irait ici aussi (ex: '/icon-192.png')
];

// Événement 'install': Mettre en cache tous les fichiers statiques
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Fichiers statiques mis en cache avec succès.');
                return cache.addAll(urlsToCache).catch(error => {
                    console.error('Échec de la mise en cache de tous les fichiers:', error);
                });
            })
    );
});

// Événement 'fetch': Servir les ressources à partir du cache (stratégie Cache-First)
self.addEventListener('fetch', (event) => {
    // Ne pas intercepter les requêtes non-HTTP (comme chrome-extension://)
    if (!event.request.url.startsWith('http')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Si la ressource est dans le cache, la retourner
                if (response) {
                    return response;
                }
                
                // Sinon, essayer de la récupérer sur le réseau
                return fetch(event.request).then((networkResponse) => {
                    // Vérifier si nous avons reçu une réponse valide
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }
                    
                    // Cloner la réponse pour la mettre dans le cache car le corps d'une réponse ne peut être lu qu'une seule fois
                    const responseToCache = networkResponse.clone();
                    
                    // Mettre à jour le cache
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            // On ne met en cache que les requêtes GET pour éviter des problèmes
                            if (event.request.method === 'GET') {
                                cache.put(event.request, responseToCache);
                            }
                        });
                    
                    return networkResponse;
                }).catch(error => {
                    // Ceci attrape les erreurs réseau (quand l'utilisateur est vraiment hors ligne)
                    console.error('Fetch failed; returning offline placeholder:', error);
                    // Vous pourriez retourner ici une page de 'hors ligne' personnalisée si vous en aviez une
                    // return caches.match('/offline.html');
                });
            })
    );
});

// Événement 'activate': Supprimer les anciens caches
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        // Supprimer les caches obsolètes
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Assurez-vous que le Service Worker contrôle les clients immédiatement
    return self.clients.claim();
});
