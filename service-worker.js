/* 🕊️ Pintando a Palavra — Service Worker Universal v1.1.2 */
const SW_VERSION = 'pp-sw-v1.1.2';

/* ---------------- CORE CACHE (shell) ---------------- */
const CORE = [
  '/', '/index.html', '/indexes.html', '/indexen.html',
  '/login.html', '/offline.html', '/manifest.json',
  '/icon-192.png', '/icon-512.png',
  '/icons/icon-192.png', '/icons/icon-512.png',
  '/app/index.html',
  '/atividades/index.html',
  '/pdfcompleto/index.html'
];

/* ---------------- HELPERS ---------------- */
const isHTML = (req) => req.destination === 'document' || req.mode === 'navigate';
const isStatic = (req) => ['style','script','font'].includes(req.destination);
const isImageOrSVG = (url, req) =>
  req.destination === 'image' ||
  url.pathname.endsWith('.svg') ||
  url.pathname.match(/\/\d+\.svg$/);
const isPDF = (url) =>
  url.pathname.startsWith('/pdfcompleto/pdfs/') ||
  url.pathname.startsWith('/atividades/pdfs/');

/* ---------------- NETWORK TIMEOUT (HTML) ---------------- */
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

/* ---------------- INSTALL ---------------- */
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SW_VERSION);
    await cache.addAll(CORE);
    console.log('✅ [SW] Core cache instalado');
    self.skipWaiting();
  })());
});

/* ---------------- ACTIVATE ---------------- */
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== SW_VERSION).map(k => caches.delete(k)));
    console.log('🔄 [SW] Versões antigas limpas');
    await self.clients.claim();
  })());
});

/* ---------------- FETCH ---------------- */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Só mesma origem
  if (url.origin !== self.location.origin) return;

  /* 1️⃣ HTML — network-first com fallback */
  if (isHTML(request)) {
    event.respondWith((async () => {
      try {
        const net = await networkWithTimeout(request, 3000);
        const cache = await caches.open(SW_VERSION);
        cache.put(url.pathname, net.clone()).catch(()=>{});
        return net;
      } catch {
        const cache = await caches.open(SW_VERSION);
        let path = url.pathname;
        if (path.startsWith('/en/')) path = path.replace('/en/', '/');
        else if (path.startsWith('/es/')) path = path.replace('/es/', '/');
        return (
          (await cache.match(path)) ||
          (await cache.match('/index.html')) ||
          (await cache.match('/offline.html'))
        );
      }
    })());
    return;
  }

  /* 2️⃣ PDFs — cache-first sob demanda */
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
        const core = await caches.open(SW_VERSION);
        return core.match('/offline.html');
      }
    })());
    return;
  }

  /* 3️⃣ CSS / JS / FONTS — stale-while-revalidate */
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

  /* 4️⃣ Imagens e SVGs — cache-first com atualização */
  if (isImageOrSVG(url, request)) {
    event.respondWith((async () => {
      const cache = await caches.open(SW_VERSION + '-images');
      const cached = await cache.match(request);
      const fetchPromise = fetch(request).then((resp) => {
        if (resp && resp.ok) cache.put(request, resp.clone());
        return resp;
      }).catch(() => null);
      return cached || fetchPromise || (await caches.match('/offline.html'));
    })());
    return;
  }

  /* 5️⃣ Demais — tenta rede, fallback cache */
  event.respondWith((async () => {
    try {
      return await fetch(request);
    } catch {
      const cache = await caches.open(SW_VERSION);
      return cache.match(request) || cache.match('/offline.html');
    }
  })());
});
