// ✅ Pintando a Palavra — Service Worker Inteligente (v1.4.4)
// Mantém apenas o idioma acessado (PT, ES ou EN) e cacheia SVGs + PDFs

const CACHE_NAME = 'pintando-a-palavra-v1.4.4';
const OFFLINE_URL = '/offline.html';

/* 🗂️ Arquivos-base universais */
const CORE_FILES = [
  '/login.html',
  '/manifest.json',
  OFFLINE_URL,
  '/icon-192.png',
  '/icon-512.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/audio/entrada.mp3',
  '/app/index.html',
  '/atividades/index.html',
  '/pdfcompleto/index.html'
];

/* 🎨 Pré-carrega 80 SVGs */
const SVG_LIST = Array.from({ length: 80 }, (_, i) => `/app/svgs/${i + 1}.svg`);

/* 🧠 Helpers */
const isHTML = req => req.destination === 'document' || req.mode === 'navigate';
const isStatic = req => ['style', 'script', 'font'].includes(req.destination);
const isImageOrSVG = (url, req) =>
  req.destination === 'image' ||
  url.pathname.endsWith('.svg') ||
  url.pathname.match(/\/\d+\.svg$/);
const isPDF = url => url.pathname.endsWith('.pdf') || url.pathname.includes('/pdf');

/* ⚙️ INSTALAÇÃO — pré-cache do idioma atual + base + SVGs */
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const pathname = self.location.pathname || '/index.html';

    // Detecta idioma atual
    let activeIndex = '/index.html';
    if (pathname.includes('indexes')) activeIndex = '/indexes.html';
    else if (pathname.includes('indexen')) activeIndex = '/indexen.html';

    const files = [activeIndex, ...CORE_FILES, ...SVG_LIST];
    let ok = 0;

    for (const url of files) {
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (res.ok) {
          await cache.put(url, res.clone());
          ok++;
        }
      } catch {
        console.warn('⚠️ Ignorado (não encontrado):', url);
      }
    }

    console.log(`✅ [SW] ${ok} arquivos pré-cacheados (${activeIndex} + SVGs 1–80).`);
    self.skipWaiting();
  })());
});

/* ♻️ ATIVAÇÃO — remove versões antigas */
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    console.log('🔄 [SW] Caches antigos removidos');
    await self.clients.claim();
  })());
});

/* 🌐 FETCH — estratégias principais */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  /* 1️⃣ HTML — network-first (mantém idioma atual offline) */
  if (isHTML(request)) {
    event.respondWith((async () => {
      try {
        const net = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(url.pathname, net.clone());
        return net;
      } catch {
        const cache = await caches.open(CACHE_NAME);

        // Mantém o idioma atual como fallback
        let fallback = '/index.html';
        if (url.pathname.includes('indexes')) fallback = '/indexes.html';
        else if (url.pathname.includes('indexen')) fallback = '/indexen.html';

        return (
          (await cache.match(url.pathname)) ||
          (await cache.match(fallback)) ||
          (await cache.match(OFFLINE_URL))
        );
      }
    })());
    return;
  }

  /* 2️⃣ PDFs — cache sob demanda */
  if (isPDF(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME + '-pdfs');
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const resp = await fetch(request);
        if (resp.ok) cache.put(request, resp.clone());
        return resp;
      } catch {
        const core = await caches.open(CACHE_NAME);
        return core.match(OFFLINE_URL);
      }
    })());
    return;
  }

  /* 3️⃣ CSS / JS / FONTS — stale-while-revalidate */
  if (isStatic(request)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME + '-assets');
      const cached = await cache.match(request);
      const fetchPromise = fetch(request).then((resp) => {
        if (resp && resp.ok) cache.put(request, resp.clone());
        return resp;
      }).catch(() => null);
      return cached || fetchPromise || fetch(request);
    })());
    return;
  }

  /* 4️⃣ IMAGENS / SVGs — cache-first (com atualização) */
  if (isImageOrSVG(url, request)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME + '-images');
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const resp = await fetch(request);
        if (resp.ok) cache.put(request, resp.clone());
        return resp;
      } catch {
        const core = await caches.open(CACHE_NAME);
        return core.match(OFFLINE_URL);
      }
    })());
    return;
  }

  /* 5️⃣ Outros — rede → cache fallback */
  event.respondWith((async () => {
    try {
      return await fetch(request);
    } catch {
      const cache = await caches.open(CACHE_NAME);
      return cache.match(request) || cache.match(OFFLINE_URL);
    }
  })());
});
