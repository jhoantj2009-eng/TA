const CACHE_VERSION = 'v3';
const SHELL_CACHE = `permiso-alturas-shell-${CACHE_VERSION}`;
const ASSETS_CACHE = `permiso-alturas-assets-${CACHE_VERSION}`;
const FONTS_CACHE = `permiso-alturas-fonts-${CACHE_VERSION}`;
const ACTIVE_CACHES = [SHELL_CACHE, ASSETS_CACHE, FONTS_CACHE];

const NETWORK_TIMEOUT_MS = 4000;

const CORE_SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/company_logo.jpg',
  '/inveasas_logo.svg'
];

function isCacheableResponse(response) {
  return (
    response &&
    response.ok &&
    response.status === 200 &&
    (response.type === 'basic' || response.type === 'cors')
  );
}

function isViteDevRequest(url) {
  return (
    url.pathname.startsWith('/@vite') ||
    url.pathname.startsWith('/@react-refresh') ||
    url.pathname.startsWith('/@fs/') ||
    url.pathname.startsWith('/@id/') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.searchParams.has('t') ||
    url.searchParams.has('v')
  );
}

function isGoogleFontOrigin(origin) {
  return (
    origin === 'https://fonts.googleapis.com' ||
    origin === 'https://fonts.gstatic.com'
  );
}

function extractAssetUrlsFromHtml(htmlText) {
  const urls = new Set();
  const assetRegex = /(?:src|href)=["'](\/assets\/[^"']+\.(?:js|mjs|css|woff2?|png|jpe?g|svg))["']/gi;
  let match;
  while ((match = assetRegex.exec(htmlText)) !== null) {
    if (match[1]) {
      urls.add(match[1]);
    }
  }
  return Array.from(urls);
}

async function fetchWithTimeout(request, timeoutMs) {
  if (typeof AbortController === 'undefined') {
    return fetch(request);
  }
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timerId);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const shellCache = await caches.open(SHELL_CACHE);
      const assetsCache = await caches.open(ASSETS_CACHE);

      await Promise.allSettled(
        CORE_SHELL_URLS.map(async (url) => {
          const response = await fetch(new Request(url, { cache: 'reload' }));
          if (isCacheableResponse(response)) {
            await shellCache.put(url, response);
          }
        })
      );

      try {
        const htmlResponse = await fetch(new Request('/index.html', { cache: 'reload' }));
        if (isCacheableResponse(htmlResponse)) {
          const htmlForCache = htmlResponse.clone();
          const htmlForRoot = htmlResponse.clone();
          const htmlText = await htmlResponse.text();

          await shellCache.put('/index.html', htmlForCache);
          await shellCache.put('/', htmlForRoot);

          const discoveredAssets = extractAssetUrlsFromHtml(htmlText);
          await Promise.allSettled(
            discoveredAssets.map(async (assetUrl) => {
              const assetRes = await fetch(new Request(assetUrl, { cache: 'reload' }));
              if (isCacheableResponse(assetRes)) {
                await assetsCache.put(assetUrl, assetRes);
              }
            })
          );
        }
      } catch {
        // Los archivos base del shell ya quedaron cacheados
      }

      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => !ACTIVE_CACHES.includes(name))
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function handleNavigationRequest(request, url) {
  const shellCache = await caches.open(SHELL_CACHE);

  try {
    const networkResponse = await fetchWithTimeout(request, NETWORK_TIMEOUT_MS);
    if (isCacheableResponse(networkResponse)) {
      await shellCache.put(request, networkResponse.clone()).catch(() => undefined);
      if (url.pathname === '/' || url.pathname === '/index.html') {
        await shellCache.put('/index.html', networkResponse.clone()).catch(() => undefined);
        await shellCache.put('/', networkResponse.clone()).catch(() => undefined);
      }
      return networkResponse;
    }
    if (networkResponse.status >= 500) {
      throw new Error(`Server error ${networkResponse.status}`);
    }
    return networkResponse;
  } catch {
    const cachedExact = await caches.match(request);
    if (cachedExact) return cachedExact;

    const cachedIndex = await caches.match('/index.html', { ignoreSearch: true });
    if (cachedIndex) return cachedIndex;

    const cachedRoot = await caches.match('/', { ignoreSearch: true });
    if (cachedRoot) return cachedRoot;

    return new Response(
      '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sin conexión</title></head><body style="font-family:system-ui,sans-serif;padding:2rem;text-align:center;background:#f8fafc;color:#0f172a;"><h1>Sin conexión a internet</h1><p>No se encontró una versión en caché para cargar la aplicación. Conéctate nuevamente e intenta recargar.</p></body></html>',
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      }
    );
  }
}

async function handleCacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const networkResponse = await fetch(request);
    if (isCacheableResponse(networkResponse)) {
      const targetCache = await caches.open(cacheName);
      targetCache.put(request, networkResponse.clone()).catch(() => undefined);
    }
    return networkResponse;
  } catch {
    return new Response('', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function handleStaleWhileRevalidate(event, request) {
  const cached = await caches.match(request);

  const networkPromise = fetch(request)
    .then(async (networkResponse) => {
      if (isCacheableResponse(networkResponse)) {
        const shellCache = await caches.open(SHELL_CACHE);
        await shellCache.put(request, networkResponse.clone()).catch(() => undefined);
      }
      return networkResponse;
    })
    .catch(() => undefined);

  event.waitUntil(networkPromise);

  if (cached) {
    return cached;
  }

  const networkResponse = await networkPromise;
  if (networkResponse) {
    return networkResponse;
  }

  return new Response('', { status: 503, statusText: 'Service Unavailable' });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Caché de fuentes de Google para soporte offline tipográfico
  if (isGoogleFontOrigin(url.origin)) {
    event.respondWith(handleCacheFirst(request, FONTS_CACHE));
    return;
  }

  // Nunca interceptar otros orígenes (Firebase Auth/Firestore, etc.), rutas /api/, ni módulos de Vite dev
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname === '/sw.js' ||
    isViteDevRequest(url)
  ) {
    return;
  }

  // 1. Navegación HTML SPA (/, /login, etc.): Network First con respaldo al App Shell
  if (
    request.mode === 'navigate' ||
    request.destination === 'document' ||
    url.pathname === '/' ||
    url.pathname === '/index.html'
  ) {
    event.respondWith(handleNavigationRequest(request, url));
    return;
  }

  // 2. Bundles con hash de producción en /assets/: Cache First
  const isProductionBundle =
    url.pathname.startsWith('/assets/') &&
    /\.(?:js|mjs|css|woff2?|png|jpe?g|svg)$/i.test(url.pathname);

  if (isProductionBundle) {
    event.respondWith(handleCacheFirst(request, ASSETS_CACHE));
    return;
  }

  // 3. Otros recursos estáticos del mismo origen (manifiesto, íconos, logos): Stale-While-Revalidate
  event.respondWith(handleStaleWhileRevalidate(event, request));
});
