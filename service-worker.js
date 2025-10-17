// ✅ Pintando a Palavra — Service Worker Final
const CACHE_NAME = 'pintandoapalavra-v1.0.9';
const CACHE_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/audio/entrada.mp3',
  '/app/index.html',
  '/atividades/index.html',
  '/pdfcompleto/index.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Instala e faz o cache inicial
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_FILES))
      .then(() => self.skipWaiting())
      .catch(err => console.error('Erro ao adicionar ao cache:', err))
  );
});

// Ativa e limpa caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Intercepta requisições e serve offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response =>
      response ||
      fetch(event.request).then(fetchRes => {
        const clone = fetchRes.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return fetchRes;
      }).catch(() => caches.match('/index.html'))
    )
  );
});
