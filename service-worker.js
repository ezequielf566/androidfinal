// ✅ Pintando a Palavra — Service Worker (v1.0.40)
// Corrigido: falha 403 no áudio externo + instalação resiliente
// Compatível com SVGs e cache automático conforme o uso

const CACHE_NAME = 'pintando-a-palavra-v1.0.43';
const OFFLINE_URL = '/offline.html';

// 🗂️ Lista de arquivos essenciais a serem cacheados
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/login.html',
  '/manifest.json',
  '/audio/entrada.mp3', // 🔊 Som local (coloque o arquivo na pasta /audio/)
  '/img/icon-512.png',
  '/img/icon-192.png',
  '/app/index.html',
  '/atividades/index.html',
  '/pdfcompleto/index.html',
  '/offline.html'
];

// 🛠️ Instalação do service worker
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      try {
        await cache.addAll(FILES_TO_CACHE);
        console.log('✅ Todos os arquivos foram cacheados com sucesso!');
      } catch (e) {
        console.warn('⚠️ Falha ao cachear algum arquivo:', e);
      }
    })
  );
});

// ♻️ Ativação: limpa caches antigos automaticamente
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('🗑️ Apagando cache antigo:', key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// 🌐 Intercepta requisições e serve do cache quando offline
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // 1️⃣ Serve do cache se existir
      if (cachedResponse) return cachedResponse;

      // 2️⃣ Busca na rede e salva automaticamente
      return fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const cloned = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
          }
          return networkResponse;
        })
        // 3️⃣ Se falhar, tenta o offline.html
        .catch(() => caches.match(OFFLINE_URL));
    })
  );
});
