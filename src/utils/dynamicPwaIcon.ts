import { DEFAULT_INVEASAS_LOGO } from '../defaultLogo';

export const DYNAMIC_ICON_CACHE_NAME = 'permiso-alturas-dynamic-icons';
const STORAGE_LOGO_KEY = 'sst_company_logo';

export interface DynamicPwaIconSet {
  version: string;
  icon180: string;
  icon192: string;
  icon512: string;
  iconMaskable512: string;
}

let lastAppliedVersion: string | null = null;
let currentManifestBlobUrl: string | null = null;

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

  // Fondo sólido (necesario para iOS Safari sin bordes negros y para zona segura de iconos maskable en Android)
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
    // Limpiar etiquetas equivalentes iniciales si no tenían ID
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
  // iOS Safari requiere PNG (recomendado 180x180) y recrear el nodo <link> refresca su caché al agregar a inicio
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

async function persistIconsToServer(iconSet: DynamicPwaIconSet): Promise<void> {
  try {
    await fetch('/api/pwa-icons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(iconSet),
    });
  } catch {
    // En despliegues estáticos (ej. GitHub Pages) no existe /api; funciona 100% vía Service Worker y DOM
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

  const basePath = getNormalizedBasePath();
  await clearDynamicIconsFromCache();

  updateDomIcons({
    apple180: `${basePath}icons/icon-192.png`,
    icon192: `${basePath}icons/icon-192.png`,
    icon512: `${basePath}icons/icon-512.png`,
  });
  updateDomManifestLink(`${basePath}manifest.webmanifest`);

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

  // Si coincide exactamente con el logo predeterminado original, restaurar los iconos estáticos base si no se fuerza
  if (trimmed === DEFAULT_INVEASAS_LOGO && !options.force) {
    if (lastAppliedVersion !== 'default') {
      await resetDynamicPwaIcons({ syncServer: options.syncServer });
    }
    return null;
  }

  const version = computeShortHash(trimmed);
  if (!options.force && lastAppliedVersion === version) {
    if (options.syncServer) {
      // Continuar para sincronizar con el servidor si se solicitó explícitamente
    } else {
      return null;
    }
  }

  try {
    const img = await loadImage(trimmed);

    // 1. Generar los 4 iconos PNG cuadrados reglamentarios
    // - 180x180 para iOS Safari (apple-touch-icon)
    // - 192x192 y 512x512 (purpose: "any") con 10% de margen visual
    // - 512x512 maskable con 18% de margen de zona segura en todos los bordes para Android
    const iconSet: DynamicPwaIconSet = {
      version,
      icon180: renderSquarePngIcon(img, 180, 0.1, '#ffffff'),
      icon192: renderSquarePngIcon(img, 192, 0.1, '#ffffff'),
      icon512: renderSquarePngIcon(img, 512, 0.1, '#ffffff'),
      iconMaskable512: renderSquarePngIcon(img, 512, 0.18, '#ffffff'),
    };

    lastAppliedVersion = version;

    // 2. Actualizar inmediatamente <link rel="apple-touch-icon"> y favicons en <head> (iOS, Android y Escritorio)
    updateDomIcons({
      apple180: iconSet.icon180,
      icon192: iconSet.icon192,
      icon512: iconSet.icon512,
    });

    // 3. Almacenar los PNG y el manifest en Cache Storage para que el Service Worker los sirva vía HTTP mismo origen
    const cachedOk = await storeDynamicIconsInCache(iconSet);
    const hasActiveSwController =
      'serviceWorker' in navigator && Boolean(navigator.serviceWorker.controller);

    const basePath = getNormalizedBasePath();
    if (cachedOk && hasActiveSwController) {
      // URL HTTP mismo origen con cache-busting: máxima compatibilidad con instalación y actualización WebAPK en Chrome/Edge/Android
      updateDomManifestLink(`${basePath}manifest.webmanifest?icon=${version}`);
    } else {
      // Respaldo inmediato antes de que el SW tome control (primera visita o modo privado): Blob manifest con URLs absolutas e iconos PNG embebidos
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

    // 4. Sincronizar con backend Node/Express si está disponible
    if (options.syncServer) {
      void persistIconsToServer(iconSet);
    }

    return iconSet;
  } catch (error) {
    console.warn('No se pudieron generar los iconos PWA dinámicos:', error);
    return null;
  }
}

/**
 * Inicializa los iconos dinámicos al arranque de la app (incluyendo pantalla de login)
 * usando el logo personalizado persistido en localStorage, y re-sincroniza cuando el SW toma control.
 */
export function initDynamicPwaIconsFromStorage(): void {
  if (typeof window === 'undefined') return;

  const applyStoredLogo = () => {
    try {
      const storedLogo = localStorage.getItem(STORAGE_LOGO_KEY);
      if (storedLogo && storedLogo !== DEFAULT_INVEASAS_LOGO) {
        void syncDynamicPwaIcons(storedLogo, { force: true });
      }
    } catch {
      // Ignorar si localStorage no está disponible
    }
  };

  applyStoredLogo();

  // Cuando el Service Worker termine de activarse en la primera visita, cambiar de Blob manifest a HTTP manifest interceptado por SW
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(() => {
        if (navigator.serviceWorker.controller) {
          applyStoredLogo();
        }
      })
      .catch(() => undefined);
  }
}
