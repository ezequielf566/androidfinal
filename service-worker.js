// ✅ Pintando a Palavra — Service Worker (v1.1.0)
// Corrigido: áudio local + cache dinâmico e offline resiliente

const CACHE_NAME = 'pintando-a-palavra-v1.1.0';
const OFFLINE_URL = '/offline.html';

const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/menu.html',
  '/login.html',
  '/manifest.json',
  '/audio/entrada.mp3',
  '/audio/fundo.mp3', // 🔊 fundo musical offline
  '/img/icon-512.png',
  '/img/icon-192.png',
  '/app/index.html',
  '/atividades/index.html',
  '/pdfcompleto/index.html',
  '/offline.html'
];

// 🛠️ Instalação
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      try {
        await cache.addAll(FILES_TO_CACHE);
        console.log('✅ Todos os arquivos foram cacheados!');
      } catch (e) {
        console.warn('⚠️ Falha ao cachear:', e);
      }
    })
  );
});

// ♻️ Ativação
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => key !== CACHE_NAME && caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// 🌐 Interceptação
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL));
    })
  );
});
