/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Service Worker Principal de PWA (public/sw.js) - Taju Coffee House
 * 
 * Permite que los navegadores (Android Chrome/Edge, Desktop, iOS Safari)
 * reconozcan la aplicación web como una Progressive Web App (PWA) instalable,
 * gestionando caché básico de activos estáticos y ciclo de vida.
 */

const CACHE_NAME = 'taju-coffee-pwa-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png',
  '/icon.svg',
];

// Instalación del Service Worker y precarga de recursos base
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Algunos activos iniciales no pudieron cachearse:', err);
      });
    })
  );
});

// Activación y limpieza de cachés antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return null;
        })
      )
    )
  );
  self.clients.claim();
});

// Estrategia Network-First con respaldo en Caché para navegación y activos
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignorar peticiones que no sean GET o peticiones a APIs de Firebase/Backend
  if (
    request.method !== 'GET' ||
    request.url.includes('firestore.googleapis.com') ||
    request.url.includes('identitytoolkit.googleapis.com') ||
    request.url.includes('/api/')
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Sin conexión a internet', {
            status: 503,
            statusText: 'Service Unavailable',
          });
        });
      })
  );
});
