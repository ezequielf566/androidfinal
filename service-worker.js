/* Pintando a Palavra — SW universal (v1.0) */
const SW_VERSION = 'pp-sw-v1.0.0';

const CORE = [
  '/',                         // raiz
  '/index.html',               // menu PT
  '/login.html',               // login
  '/offline.html',             // fallback
  '/manifest.json',

  // páginas internas (PT)
  '/app/index.html',
  '/atividades/index.html',
  '/pdfcompleto/index.html',

  // ícones / imagens essenciais do shell (ajuste se necessário)
  '/icon-192.png',
  '/icon-512.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Helpers -------------------------------------------------------
const isHTML = (req) =>
  req.destination === 'document' ||
  (req.mode === 'navigate');

const isStatic = (req) =>
  ['style','script','font'].includes(req.destination);

const isImage = (req) => req.destination === 'image';

const isPDF = (url) =>
  url.pathname.startsWith('/pdfcompleto/pdfs/') ||
  url.pathname.startsWith('/atividades/pdfs/');

// Timeout “network-first”
const networkWithTimeout = async (request, ms = 3500) => {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    const resp = await fetch(request, { signal: ctrl.signal });
    clearTimeout(id);
    return resp;
  } catch {
    clearTimeout(id);
    throw new Error('timeout-or-network-fail');
  }
};

// Install: pré-cache do shell
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SW_VERSION);
    await cache.addAll(CORE);
    self.skipWaiting();
  })());
});

// Activate: limpa versões antigas e assume controle
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k !== SW_VERSION).map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// Fetch: estratégias por tipo
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Só mesma origem
  if (url.origin !== self.location.origin) return;

  // 1) Navegações (HTML)
  if (isHTML(request)) {
    event.respondWith((async () => {
      try {
        // tenta rede rápido
        const net = await networkWithTimeout(request, 3000);
        // se ok, atualiza cache do HTML
        const cache = await caches.open(SW_VERSION);
        cache.put('/index.html', net.clone()).catch(()=>{});
        return net;
      } catch {
        // fallback: cache do destino ou index, depois offline
        const cache = await caches.open(SW_VERSION);

        // mapeia EN/ES -> PT quando não existir
        // ex: /en/atividades/ vira /atividades/
        let fallbackPath = url.pathname;

        if (fallbackPath.startsWith('/en/')) {
          fallbackPath = fallbackPath.replace('/en/', '/');
        } else if (fallbackPath.startsWith('/es/')) {
          fallbackPath = fallbackPath.replace('/es/', '/');
        }

        // tenta o caminho solicitado
        let cached = await cache.match(fallbackPath);
        if (cached) return cached;

        // tenta index.html
        cached = await cache.match('/index.html');
        if (cached) return cached;

        // último recurso:
        return cache.match('/offline.html');
      }
    })());
    return;
  }

  // 2) PDFs (cache-first sob demanda)
  if (isPDF(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(SW_VERSION + '-pdfs');
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const resp = await fetch(request, { cache: 'no-cache' });
        if (resp.ok) cache.put(request, resp.clone());
        return resp;
      } catch {
        // sem rede & sem cache -> offline.html
        const core = await caches.open(SW_VERSION);
        return core.match('/offline.html');
      }
    })());
    return;
  }

  // 3) CSS/JS/Fonts (stale-while-revalidate)
  if (isStatic(request)) {
    event.respondWith((async () => {
      const cache = await caches.open(SW_VERSION + '-assets');
      const cached = await cache.match(request);
      const fetchPromise = fetch(request).then((resp) => {
        if (resp && resp.ok) cache.put(request, resp.clone());
        return resp;
      }).catch(() => null);
      return cached || fetchPromise || fetch(request);
    })());
    return;
  }

  // 4) Imagens (stale-while-revalidate)
  if (isImage(request)) {
    event.respondWith((async () => {
      const cache = await caches.open(SW_VERSION + '-images');
      const cached = await cache.match(request);
      const fetchPromise = fetch(request).then((resp) => {
        if (resp && resp.ok) cache.put(request, resp.clone());
        return resp;
      }).catch(() => null);
      return cached || fetchPromise || fetch(request);
    })());
    return;
  }

  // 5) Demais (rede -> cache fallback)
  event.respondWith((async () => {
    try {
      return await fetch(request);
    } catch {
      const cache = await caches.open(SW_VERSION);
      return cache.match(request) || cache.match('/offline.html');
    }
  })());
});
