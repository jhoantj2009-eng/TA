const CACHE_VERSION = '__SW_CACHE_VERSION__';
const SHELL_CACHE = `permiso-alturas-shell-${CACHE_VERSION}`;
const ASSETS_CACHE = `permiso-alturas-assets-${CACHE_VERSION}`;
const FONTS_CACHE = `permiso-alturas-fonts-${CACHE_VERSION}`;
const DYNAMIC_ICON_CACHE = 'permiso-alturas-dynamic-icons';
const ACTIVE_CACHES = [SHELL_CACHE, ASSETS_CACHE, FONTS_CACHE, DYNAMIC_ICON_CACHE];

const NETWORK_TIMEOUT_MS = 4000;

// Resuelve automáticamente la ruta base donde vive sw.js (ej. "/TA/" en GitHub Pages o "/" en raíz)
const BASE_PATH = new URL('./', self.location.href).pathname;

function withBase(relativePath) {
  const clean = relativePath.replace(/^\/+/, '');
  return `${BASE_PATH}${clean}`;
}

const CORE_SHELL_URLS = [
  BASE_PATH,
  withBase('index.html'),
  withBase('manifest.webmanifest'),
  withBase('icons/apple-touch-icon.png'),
  withBase('icons/icon-192.png'),
  withBase('icons/icon-512.png'),
  withBase('icons/icon-maskable-512.png'),
  withBase('company_logo.jpg'),
  withBase('inveasas_logo.svg')
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
  const path = url.pathname;
  return (
    path.includes('/@vite') ||
    path.includes('/@react-refresh') ||
    path.includes('/@fs/') ||
    path.includes('/@id/') ||
    path.includes('/src/') ||
    path.includes('/node_modules/') ||
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
  const assetRegex = /(?:src|href)=["']([^"']*\/assets\/[^"']+\.(?:js|mjs|css|woff2?|png|jpe?g|svg))["']/gi;
  let match;
  while ((match = assetRegex.exec(htmlText)) !== null) {
    if (match[1]) {
      try {
        const resolved = new URL(match[1], self.location.href);
        if (resolved.origin === self.location.origin) {
          urls.add(resolved.pathname);
        }
      } catch {
        // Ignorar URLs inválidas
      }
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
        const indexUrl = withBase('index.html');
        const htmlResponse = await fetch(new Request(indexUrl, { cache: 'reload' }));
        if (isCacheableResponse(htmlResponse)) {
          const htmlForCache = htmlResponse.clone();
          const htmlForRoot = htmlResponse.clone();
          const htmlText = await htmlResponse.text();

          await shellCache.put(indexUrl, htmlForCache);
          await shellCache.put(BASE_PATH, htmlForRoot);

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
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isDynamicPwaAssetPath(pathname) {
  return (
    pathname === withBase('manifest.webmanifest') ||
    pathname === withBase('icons/icon-192.png') ||
    pathname === withBase('icons/icon-512.png') ||
    pathname === withBase('icons/icon-maskable-512.png') ||
    pathname === withBase('icons/apple-touch-icon.png')
  );
}

async function handleDynamicPwaAsset(event, request, url) {
  try {
    const dynamicCache = await caches.open(DYNAMIC_ICON_CACHE);
    const dynamicMatch = await dynamicCache.match(url.pathname, { ignoreSearch: true });
    if (dynamicMatch) {
      return dynamicMatch;
    }
  } catch {
    // Continuar al flujo normal si falla lectura de DYNAMIC_ICON_CACHE
  }

  // Para manifest.webmanifest sin icono dinámico personalizado, priorizar red para detectar cambios de despliegue
  if (url.pathname === withBase('manifest.webmanifest')) {
    try {
      const freshManifest = await fetchWithTimeout(
        new Request(request.url, { cache: 'no-cache', credentials: 'same-origin' }),
        NETWORK_TIMEOUT_MS
      );
      if (isCacheableResponse(freshManifest)) {
        const shellCache = await caches.open(SHELL_CACHE);
        await shellCache.put(withBase('manifest.webmanifest'), freshManifest.clone()).catch(() => undefined);
        return freshManifest;
      }
    } catch {
      const fallback = await caches.match(withBase('manifest.webmanifest'), { ignoreSearch: true });
      if (fallback) return fallback;
    }
  }

  return handleStaleWhileRevalidate(event, request);
}

async function handleNavigationRequest(request, url) {
  const shellCache = await caches.open(SHELL_CACHE);
  const indexUrl = withBase('index.html');

  try {
    const freshRequest = new Request(request.url, {
      cache: 'no-cache',
      credentials: 'same-origin',
    });
    const networkResponse = await fetchWithTimeout(freshRequest, NETWORK_TIMEOUT_MS);
    if (isCacheableResponse(networkResponse)) {
      await shellCache.put(request, networkResponse.clone()).catch(() => undefined);
      if (url.pathname === BASE_PATH || url.pathname === indexUrl) {
        await shellCache.put(indexUrl, networkResponse.clone()).catch(() => undefined);
        await shellCache.put(BASE_PATH, networkResponse.clone()).catch(() => undefined);
      }
      return networkResponse;
    }
    if (networkResponse.status >= 400) {
      throw new Error(`HTTP ${networkResponse.status}`);
    }
    return networkResponse;
  } catch {
    const cachedExact = await caches.match(request);
    if (cachedExact) return cachedExact;

    const cachedIndex = await caches.match(indexUrl, { ignoreSearch: true });
    if (cachedIndex) return cachedIndex;

    const cachedRoot = await caches.match(BASE_PATH, { ignoreSearch: true });
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

  // Nunca interceptar otros orígenes (Firebase Auth/Firestore, etc.), rutas /api/, sw.js ni version.json
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname.endsWith('/sw.js') ||
    url.pathname.endsWith('/version.json') ||
    !url.pathname.startsWith(BASE_PATH)
  ) {
    return;
  }

  // 0. Manifiesto e íconos PWA (pueden estar actualizados dinámicamente con el logo de la empresa)
  if (isDynamicPwaAssetPath(url.pathname)) {
    event.respondWith(handleDynamicPwaAsset(event, request, url));
    return;
  }

  if (isViteDevRequest(url)) {
    return;
  }

  // 1. Navegación HTML SPA bajo BASE_PATH: Network First con respaldo al App Shell
  if (
    request.mode === 'navigate' ||
    request.destination === 'document' ||
    url.pathname === BASE_PATH ||
    url.pathname === withBase('index.html')
  ) {
    event.respondWith(handleNavigationRequest(request, url));
    return;
  }

  // 2. Bundles con hash de producción en <BASE_PATH>assets/: Cache First
  const isProductionBundle =
    url.pathname.startsWith(withBase('assets/')) &&
    /\.(?:js|mjs|css|woff2?|png|jpe?g|svg)$/i.test(url.pathname);

  if (isProductionBundle) {
    event.respondWith(handleCacheFirst(request, ASSETS_CACHE));
    return;
  }

  // 3. Otros recursos estáticos dentro de BASE_PATH (manifiesto, íconos, logos): Stale-While-Revalidate
  event.respondWith(handleStaleWhileRevalidate(event, request));
});
