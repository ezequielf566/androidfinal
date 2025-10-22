/* Pintando a Palavra — SW universal v2.0 (PT/ES/EN + Offline total) */
const SW_VERSION = 'pp-sw-v2.0.1';

const CORE = [
  '/', '/index.html', '/indexes.html', '/indexen.html',
  '/login.html', '/logines.html', '/loginen.html',
  '/offline.html', '/manifest.json',
  '/icons/icon-192.png', '/icons/icon-512.png',

  // Apps
  '/app/index.html', '/app/indexes.html', '/app/indexen.html',
  '/atividades/index.html',
  '/pdfcompleto/index.html'
];

// Helpers
const isHTML = req => req.destination === 'document' || req.mode === 'navigate';
const isStatic = req => ['style','script','font'].includes(req.destination);
const isImage = req => req.destination === 'image';
const isPDF = url => url.pathname.includes('/pdfs/');

const networkWithTimeout = async (req, ms = 3500) => {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    const resp = await fetch(req, { signal: ctrl.signal });
    clearTimeout(id);
    return resp;
  } catch {
    clearTimeout(id);
    throw new Error('timeout');
  }
};

// Instalação (pré-cache do shell)
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(SW_VERSION);
    const ok = [];
    for (const url of CORE) {
      try {
        await cache.add(url);
        ok.push(url);
      } catch {
        console.warn('⚠️ Falhou ao adicionar:', url);
      }
    }
    console.log('✅ Instalado com sucesso:', ok.length, 'arquivos');
    self.skipWaiting();
  })());
});

// Ativação (limpa versões antigas)
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== SW_VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Fetch (Offline-first híbrido)
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // HTML pages
  if (isHTML(req)) {
    e.respondWith((async () => {
      try {
        const net = await networkWithTimeout(req, 3000);
        const cache = await caches.open(SW_VERSION);
        cache.put(req, net.clone());
        return net;
      } catch {
        const cache = await caches.open(SW_VERSION);
        const langs = ['/index.html', '/indexes.html', '/indexen.html'];
        for (const f of [url.pathname, ...langs, '/offline.html']) {
          const cached = await cache.match(f);
          if (cached) return cached;
        }
      }
    })());
    return;
  }

  // PDFs (cache-first)
  if (isPDF(url)) {
    e.respondWith((async () => {
      const cache = await caches.open(SW_VERSION + '-pdf');
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const net = await fetch(req);
        if (net.ok) cache.put(req, net.clone());
        return net;
      } catch {
        const core = await caches.open(SW_VERSION);
        return core.match('/offline.html');
      }
    })());
    return;
  }

  // Assets estáticos
  if (isStatic(req) || isImage(req)) {
    e.respondWith((async () => {
      const cache = await caches.open(SW_VERSION + '-assets');
      const cached = await cache.match(req);
      const fetcher = fetch(req).then(r => {
        if (r && r.ok) cache.put(req, r.clone());
        return r;
      }).catch(() => null);
      return cached || fetcher;
    })());
    return;
  }

  // Demais: network fallback cache
  e.respondWith((async () => {
    try {
      return await fetch(req);
    } catch {
      const cache = await caches.open(SW_VERSION);
      return cache.match(req) || cache.match('/offline.html');
    }
  })());
});
