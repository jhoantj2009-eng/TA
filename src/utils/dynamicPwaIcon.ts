import { DEFAULT_INVEASAS_LOGO, fetchServerHeaderConfig } from '../defaultLogo';

export const DYNAMIC_ICON_CACHE_NAME = 'permiso-alturas-dynamic-icons';
export const COMPANY_LOGO_UPDATED_EVENT = 'company-logo-updated';
const STORAGE_LOGO_KEY = 'sst_company_logo';
const STORAGE_COMPANY_NAME_KEY = 'sst_company_name';

export interface DynamicPwaIconSet {
  version: string;
  icon180: string;
  icon192: string;
  icon512: string;
  iconMaskable512: string;
}

export interface CompanyLogoUpdateDetail {
  logo: string;
  companyName?: string;
  version?: string;
}

let lastAppliedVersion: string | null = null;
let lastAppliedViaHttp = false;
let lastKnownLogoSrc: string | null = null;
let currentManifestBlobUrl: string | null = null;
let swListenersAttached = false;

export function notifyCompanyLogoUpdated(detail: CompanyLogoUpdateDetail): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent<CompanyLogoUpdateDetail>(COMPANY_LOGO_UPDATED_EVENT, { detail }));
  } catch {
    // Ignorar en entornos sin CustomEvent
  }
}

export function getActiveCompanyLogoFromStorage(): { logo: string; companyName: string } {
  if (typeof window === 'undefined') {
    return { logo: DEFAULT_INVEASAS_LOGO, companyName: 'DCM Servicios & Consultoría' };
  }
  try {
    const storedLogo = localStorage.getItem(STORAGE_LOGO_KEY);
    const logo = storedLogo !== null ? storedLogo : DEFAULT_INVEASAS_LOGO;
    const companyName = localStorage.getItem(STORAGE_COMPANY_NAME_KEY) || 'DCM Servicios & Consultoría';
    return { logo, companyName };
  } catch {
    return { logo: DEFAULT_INVEASAS_LOGO, companyName: 'DCM Servicios & Consultoría' };
  }
}

function getNormalizedBasePath(): string {
  const rawBase = import.meta.env.BASE_URL || '/';
  return rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
}

function getAbsoluteBaseUrl(): string {
  const basePath = getNormalizedBasePath();
  if (typeof window === 'undefined') return basePath;
  return new URL(basePath, window.location.origin).href;
}

function computeShortHash(input: string): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const combined = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  return combined.slice(0, 10);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen para generar iconos PWA'));
    img.src = src;
  });
}

function renderSquarePngIcon(
  img: HTMLImageElement,
  size: number,
  paddingRatio: number,
  backgroundColor = '#ffffff'
): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Contexto 2D no disponible');
  }

  // Fondo sólido (requerido para iOS Safari sin esquinas negras y zona segura maskable en Android)
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, size, size);

  const safeMargin = Math.round(size * paddingRatio);
  const maxW = Math.max(1, size - safeMargin * 2);
  const maxH = Math.max(1, size - safeMargin * 2);

  const naturalW = img.naturalWidth || size;
  const naturalH = img.naturalHeight || size;
  const aspect = naturalW / naturalH;

  let drawW = maxW;
  let drawH = drawW / aspect;
  if (drawH > maxH) {
    drawH = maxH;
    drawW = drawH * aspect;
  }

  const dx = Math.round((size - drawW) / 2);
  const dy = Math.round((size - drawH) / 2);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, dx, dy, drawW, drawH);

  return canvas.toDataURL('image/png');
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64Data] = dataUrl.split(',');
  const mimeMatch = header.match(/data:([^;]+);base64/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
  const binary = atob(base64Data || '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

function buildManifestPayload(iconSources: {
  icon192: string;
  icon512: string;
  iconMaskable512: string;
}) {
  const absBase = getAbsoluteBaseUrl();
  return {
    id: absBase,
    name: 'Permiso de Trabajo en Alturas',
    short_name: 'Alturas SST',
    description:
      'Aplicación instalable para diligenciar, firmar y exportar permisos de trabajo en alturas conforme a la Resolución 4272 de 2021.',
    start_url: absBase,
    scope: absBase,
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'any',
    lang: 'es',
    dir: 'ltr',
    theme_color: '#1a4c6e',
    background_color: '#0f172a',
    categories: ['business', 'productivity', 'utilities'],
    prefer_related_applications: false,
    icons: [
      {
        src: iconSources.icon192,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: iconSources.icon512,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: iconSources.iconMaskable512,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}

function replaceLinkTag(
  id: string,
  rel: string,
  href: string,
  extraAttrs: Record<string, string> = {}
) {
  if (typeof document === 'undefined') return;
  const existingById = document.getElementById(id);
  if (existingById) {
    existingById.remove();
  } else {
    const selector = extraAttrs.sizes
      ? `link[rel="${rel}"][sizes="${extraAttrs.sizes}"]`
      : `link[rel="${rel}"]`;
    const matches = document.head.querySelectorAll(selector);
    matches.forEach((node) => node.remove());
  }

  const link = document.createElement('link');
  link.id = id;
  link.rel = rel;
  link.href = href;
  Object.entries(extraAttrs).forEach(([key, val]) => {
    link.setAttribute(key, val);
  });
  document.head.appendChild(link);
}

function updateDomIcons(icons: {
  apple180: string;
  icon192: string;
  icon512: string;
}) {
  // iOS Safari requiere PNG 180x180 sobre URL HTTP mismo origen siempre que SW o servidor estén activos
  replaceLinkTag('pwa-apple-touch-icon', 'apple-touch-icon', icons.apple180, {
    sizes: '180x180',
  });
  replaceLinkTag('pwa-icon-192', 'icon', icons.icon192, {
    type: 'image/png',
    sizes: '192x192',
  });
  replaceLinkTag('pwa-icon-512', 'icon', icons.icon512, {
    type: 'image/png',
    sizes: '512x512',
  });
}

function updateDomManifestLink(href: string) {
  if (typeof document === 'undefined') return;
  if (currentManifestBlobUrl && currentManifestBlobUrl !== href) {
    URL.revokeObjectURL(currentManifestBlobUrl);
    currentManifestBlobUrl = null;
  }
  if (href.startsWith('blob:')) {
    currentManifestBlobUrl = href;
  }
  replaceLinkTag('pwa-manifest-link', 'manifest', href);
}

async function storeDynamicIconsInCache(iconSet: DynamicPwaIconSet): Promise<boolean> {
  if (typeof window === 'undefined' || !('caches' in window)) return false;

  try {
    const basePath = getNormalizedBasePath();
    const absBase = getAbsoluteBaseUrl();
    const cache = await caches.open(DYNAMIC_ICON_CACHE_NAME);

    const pngHeaders = {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    };

    const manifestPayload = buildManifestPayload({
      icon192: `${absBase}icons/icon-192.png?icon=${iconSet.version}`,
      icon512: `${absBase}icons/icon-512.png?icon=${iconSet.version}`,
      iconMaskable512: `${absBase}icons/icon-maskable-512.png?icon=${iconSet.version}`,
    });

    await Promise.all([
      cache.put(
        `${basePath}icons/apple-touch-icon.png`,
        new Response(dataUrlToBlob(iconSet.icon180), { headers: pngHeaders })
      ),
      cache.put(
        `${basePath}icons/icon-192.png`,
        new Response(dataUrlToBlob(iconSet.icon192), { headers: pngHeaders })
      ),
      cache.put(
        `${basePath}icons/icon-512.png`,
        new Response(dataUrlToBlob(iconSet.icon512), { headers: pngHeaders })
      ),
      cache.put(
        `${basePath}icons/icon-maskable-512.png`,
        new Response(dataUrlToBlob(iconSet.iconMaskable512), { headers: pngHeaders })
      ),
      cache.put(
        `${basePath}manifest.webmanifest`,
        new Response(JSON.stringify(manifestPayload, null, 2), {
          headers: {
            'Content-Type': 'application/manifest+json; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        })
      ),
    ]);

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'DYNAMIC_PWA_ICONS_UPDATED',
        version: iconSet.version,
      });
    }

    return true;
  } catch {
    return false;
  }
}

async function clearDynamicIconsFromCache(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  try {
    await caches.delete(DYNAMIC_ICON_CACHE_NAME);
  } catch {
    // Ignorar errores en entornos restringidos
  }
}

async function persistIconsToServer(iconSet: DynamicPwaIconSet): Promise<boolean> {
  try {
    const res = await fetch('/api/pwa-icons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(iconSet),
    });
    return res.ok;
  } catch {
    // En despliegues estáticos (ej. GitHub Pages) no existe /api; funciona 100% vía Service Worker y DOM
    return false;
  }
}

async function resetIconsOnServer(): Promise<void> {
  try {
    await fetch('/api/pwa-icons/reset', { method: 'POST' });
  } catch {
    // Ignorar en entornos estáticos sin backend Node
  }
}

export async function resetDynamicPwaIcons(options: { syncServer?: boolean } = {}): Promise<void> {
  if (typeof window === 'undefined') return;
  lastAppliedVersion = 'default';
  lastAppliedViaHttp = true;
  lastKnownLogoSrc = DEFAULT_INVEASAS_LOGO;

  const basePath = getNormalizedBasePath();
  await clearDynamicIconsFromCache();

  updateDomIcons({
    apple180: `${basePath}icons/apple-touch-icon.png`,
    icon192: `${basePath}icons/icon-192.png`,
    icon512: `${basePath}icons/icon-512.png`,
  });
  updateDomManifestLink(`${basePath}manifest.webmanifest`);

  notifyCompanyLogoUpdated({
    logo: getActiveCompanyLogoFromStorage().logo,
    companyName: getActiveCompanyLogoFromStorage().companyName,
    version: 'default',
  });

  if (options.syncServer) {
    await resetIconsOnServer();
  }
}

/**
 * Genera y sincroniza dinámicamente todos los iconos PWA (180px iOS, 192px, 512px y 512px maskable)
 * junto con el Web App Manifest cada vez que cambia la imagen del logotipo corporativo.
 */
export async function syncDynamicPwaIcons(
  logoSrc: string | null | undefined,
  options: { syncServer?: boolean; force?: boolean } = {}
): Promise<DynamicPwaIconSet | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  const trimmed = (logoSrc || '').trim();
  if (!trimmed) {
    await resetDynamicPwaIcons({ syncServer: options.syncServer });
    return null;
  }

  // Si coincide exactamente con el logo predeterminado original, usar los iconos estáticos compilados
  if (trimmed === DEFAULT_INVEASAS_LOGO && !options.force) {
    if (lastAppliedVersion !== 'default') {
      await resetDynamicPwaIcons({ syncServer: options.syncServer });
    }
    return null;
  }

  const version = computeShortHash(trimmed);
  const hasActiveSwController =
    'serviceWorker' in navigator && Boolean(navigator.serviceWorker.controller);

  // Evitar regeneración redundante salvo cuando el SW recién tomó control y debemos pasar de data/blob a HTTP
  if (!options.force && lastAppliedVersion === version) {
    const needsHttpUpgrade = hasActiveSwController && !lastAppliedViaHttp;
    if (!options.syncServer && !needsHttpUpgrade) {
      return null;
    }
  }

  try {
    const img = await loadImage(trimmed);

    // 1. Generar los 4 iconos PNG cuadrados reglamentarios con fondo blanco sólido
    const iconSet: DynamicPwaIconSet = {
      version,
      icon180: renderSquarePngIcon(img, 180, 0.1, '#ffffff'),
      icon192: renderSquarePngIcon(img, 192, 0.1, '#ffffff'),
      icon512: renderSquarePngIcon(img, 512, 0.1, '#ffffff'),
      iconMaskable512: renderSquarePngIcon(img, 512, 0.18, '#ffffff'),
    };

    // 2. Guardar los PNG y manifest en Cache Storage para intercepción por Service Worker
    const cachedOk = await storeDynamicIconsInCache(iconSet);

    // 3. Sincronizar con servidor Node/Express si se solicitó (retorna true si el servidor los sirve vía HTTP)
    const serverSynced = options.syncServer ? await persistIconsToServer(iconSet) : false;

    const canServeViaHttp = (cachedOk && hasActiveSwController) || serverSynced;
    const basePath = getNormalizedBasePath();

    lastAppliedVersion = version;
    lastAppliedViaHttp = canServeViaHttp;
    lastKnownLogoSrc = trimmed;

    if (canServeViaHttp) {
      // URLs HTTP mismo origen con ?icon=<hash>: 100% compatible con iOS Safari (apple-touch-icon) y WebAPK Android/Desktop
      updateDomIcons({
        apple180: `${basePath}icons/apple-touch-icon.png?icon=${version}`,
        icon192: `${basePath}icons/icon-192.png?icon=${version}`,
        icon512: `${basePath}icons/icon-512.png?icon=${version}`,
      });
      updateDomManifestLink(`${basePath}manifest.webmanifest?icon=${version}`);
    } else {
      // Respaldo instantáneo antes de que el SW tome control en la primera visita:
      // usar PNG data URL para favicons y Blob manifest con URLs absolutas hasta que `controllerchange` actualice a HTTP
      updateDomIcons({
        apple180: iconSet.icon180,
        icon192: iconSet.icon192,
        icon512: iconSet.icon512,
      });
      const blobManifest = buildManifestPayload({
        icon192: iconSet.icon192,
        icon512: iconSet.icon512,
        iconMaskable512: iconSet.iconMaskable512,
      });
      const blob = new Blob([JSON.stringify(blobManifest)], {
        type: 'application/manifest+json',
      });
      const blobUrl = URL.createObjectURL(blob);
      updateDomManifestLink(blobUrl);
    }

    notifyCompanyLogoUpdated({
      logo: trimmed,
      companyName: getActiveCompanyLogoFromStorage().companyName,
      version,
    });

    return iconSet;
  } catch (error) {
    console.warn('No se pudieron generar los iconos PWA dinámicos:', error);
    return null;
  }
}

/**
 * Inicializa los iconos dinámicos y el logotipo corporativo al arranque de la app
 * (incluso en la pantalla de login de un celular nuevo) combinando:
 * 1. Logo almacenado en localStorage
 * 2. Plantilla persistida en el servidor (/api/header-config) si está disponible
 * 3. Actualización automática a URLs HTTP en cuanto el Service Worker toma control (`controllerchange`)
 */
export function initDynamicPwaIconsFromStorage(): void {
  if (typeof window === 'undefined') return;

  const applyStoredLogo = (forceHttpUpgrade = false) => {
    try {
      const storedLogo = localStorage.getItem(STORAGE_LOGO_KEY) || lastKnownLogoSrc;
      if (storedLogo && storedLogo !== DEFAULT_INVEASAS_LOGO) {
        void syncDynamicPwaIcons(storedLogo, { force: forceHttpUpgrade });
      }
    } catch {
      // Ignorar si localStorage no está disponible
    }
  };

  applyStoredLogo(true);

  // En celulares/dispositivos nuevos abriendo la app por primera vez, consultar la plantilla del servidor antes del login
  void fetchServerHeaderConfig()
    .then((serverConfig) => {
      if (!serverConfig) return;
      if (serverConfig.logo && serverConfig.logo !== DEFAULT_INVEASAS_LOGO) {
        void syncDynamicPwaIcons(serverConfig.logo, { force: true });
      } else {
        notifyCompanyLogoUpdated({
          logo: serverConfig.logo !== undefined ? serverConfig.logo : DEFAULT_INVEASAS_LOGO,
          companyName: serverConfig.companyName,
        });
      }
    })
    .catch(() => undefined);

  if (!swListenersAttached && 'serviceWorker' in navigator) {
    swListenersAttached = true;

    // En la primera visita, el SW reclama control ~200ms después del arranque: cambiar inmediatamente de data/blob a HTTP
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (navigator.serviceWorker.controller) {
        applyStoredLogo(true);
      }
    });

    navigator.serviceWorker.ready
      .then(() => {
        if (navigator.serviceWorker.controller && !lastAppliedViaHttp) {
          applyStoredLogo(true);
        }
      })
      .catch(() => undefined);
  }
}
