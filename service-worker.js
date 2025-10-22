/* 🔸 Pintando a Palavra — Service Worker Universal (v1.1 Final) */
const SW_VERSION = 'pp-sw-v1.1.0';

/* 🧱 Núcleo de arquivos essenciais */
const CORE = [
  '/', '/index.html', '/indexes.html', '/indexen.html',
  '/login.html', '/offline.html', '/manifest.json',
  '/app/index.html', '/atividades/index.html', '/pdfcompleto/index.html',
  '/icon-192.png', '/icon-512.png',
  '/icons/icon-192.png', '/icons/icon-512.png'
];

/* 🧠 Funções auxiliares */
const isHTML = (req) => req.destination === 'document' || req.mode === 'navigate';
const isStatic = (req) => ['style', 'script', 'font'].includes(req.destination);
const isImage = (req) => req.destination === 'image';
const isPDF = (url) =>
  url.pathname.startsWith('/pdfcompleto/pdfs/') ||
  url.pathname.startsWith('/atividades/pdfs/');

/* ⏱️ Tenta rede com timeout */
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

/* 📦 Instalação */
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SW_VERSION);
    await cache.addAll(CORE);
    self.skipWaiting();
  })());
});

/* 🔁 Ativação */
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== SW_VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

/* 🚦 Intercepta requisições */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  /* 🌐 Navegação HTML */
  if (isHTML(request)) {
    event.respondWith((async () => {
      try {
        const net = await networkWithTimeout(request, 3000);
        const cache = await caches.open(SW_VERSION);
        cache.put(request, net.clone()).catch(() => {});
        return net;
      } catch {
        const cache = await caches.open(SW_VERSION);
        let fallbackPath = url.pathname;

        // 🔤 Corrige idiomas EN/ES -> PT
        if (fallbackPath.startsWith('/en/')) fallbackPath = fallbackPath.replace('/en/', '/');
        else if (fallbackPath.startsWith('/es/')) fallbackPath = fallbackPath.replace('/es/', '/');

        let cached = await cache.match(fallbackPath);
        if (cached) return cached;

        cached = await cache.match('/index.html');
        if (cached) return cached;

        return cache.match('/offline.html');
      }
    })());
    return;
  }

  /* 📄 PDFs (cache-first on demand) */
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

  /* 🎨 CSS/JS/Fontes (stale-while-revalidate) */
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

  /* 🖼️ Imagens (stale-while-revalidate) */
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

  /* 🔸 Outros: rede → cache → offline */
  event.respondWith((async () => {
    try {
      return await fetch(request);
    } catch {
      const cache = await caches.open(SW_VERSION);
      return cache.match(request) || cache.match('/offline.html');
    }
  })());
});
