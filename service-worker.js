// ✅ Pintando a Palavra — Service Worker completo (offline total)
const CACHE_NAME = 'pintando-a-palavra-v1.0.8';
const OFFLINE_URL = '/offline.html';

const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/login.html',
  '/manifest.json',
  '/audio/entrada.mp3',
  '/img/icon-512.png',
  '/img/icon-192.png',
  '/app/index.html',
  '/atividades/index.html',
  '/pdfcompleto/index.html'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(key => {
      if (key !== CACHE_NAME) return caches.delete(key);
    })))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (!res || res.status !== 200) return caches.match(OFFLINE_URL);
        const cloned = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        return res;
      }).catch(() => caches.match(OFFLINE_URL));
    })
  );
});
