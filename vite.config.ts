import react from '@vitejs/plugin-react';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv, type Plugin, type ResolvedConfig } from 'vite';
import {
  decodeImageDataUrl,
  generatePwaIconsFromBuffer,
  resolveProjectCompanyLogoBuffer,
} from './server/pwaIconGenerator';

function normalizeBasePath(rawPath: string): string {
  const trimmed = rawPath.trim();
  if (!trimmed || trimmed === '/') return '/';
  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

function resolveBasePath(mode: string): string {
  const env = loadEnv(mode, process.cwd(), '');

  // 1. Variable de entorno explícita (VITE_BASE_PATH o BASE_PATH)
  const explicitBase =
    process.env.VITE_BASE_PATH ||
    process.env.BASE_PATH ||
    env.VITE_BASE_PATH ||
    env.BASE_PATH;

  if (explicitBase) {
    return normalizeBasePath(explicitBase);
  }

  // 2. Detección automática del entorno de despliegue en GitHub Actions / GitHub Pages
  if (process.env.GITHUB_ACTIONS === 'true') {
    const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
    if (repoName && !repoName.endsWith('.github.io')) {
      return normalizeBasePath(`/${repoName}/`);
    }
    return repoName?.endsWith('.github.io') ? '/' : '/TA/';
  }

  // 3. Por defecto (desarrollo local, AI Studio, Cloud Run o dominio raíz): raíz "/"
  return '/';
}

function resolveBuildId(): string {
  if (process.env.VITE_BUILD_ID?.trim()) {
    return process.env.VITE_BUILD_ID.trim();
  }
  if (process.env.GITHUB_SHA) {
    const shortSha = process.env.GITHUB_SHA.slice(0, 12);
    const runNum = process.env.GITHUB_RUN_NUMBER || String(Date.now());
    return `${shortSha}-${runNum}`;
  }
  return `build-${Date.now()}`;
}

function stampIconQueryInHtml(html: string, iconHash: string): string {
  return html
    .replace(/(icons\/apple-touch-icon\.png)(?:\?icon=[^"']*)?/g, `$1?icon=${iconHash}`)
    .replace(/(icons\/icon-192\.png)(?:\?icon=[^"']*)?/g, `$1?icon=${iconHash}`)
    .replace(/(icons\/icon-512\.png)(?:\?icon=[^"']*)?/g, `$1?icon=${iconHash}`)
    .replace(/(manifest\.webmanifest)(?:\?icon=[^"']*)?/g, `$1?icon=${iconHash}`);
}

function readDevPersistedIconVersion(projectRoot: string): string | null {
  try {
    const pwaIconsPath = path.join(projectRoot, 'data', 'pwa-icons.json');
    if (fs.existsSync(pwaIconsPath)) {
      const parsed = JSON.parse(fs.readFileSync(pwaIconsPath, 'utf-8'));
      if (parsed && typeof parsed.version === 'string' && parsed.version.trim()) {
        return parsed.version.trim();
      }
    }
  } catch {
    // Ignorar errores de lectura en desarrollo
  }
  return null;
}

function pwaAutoSyncPlugin(buildId: string, builtAt: string): Plugin {
  let resolvedConfig: ResolvedConfig | null = null;

  return {
    name: 'pwa-auto-sync-version',
    configResolved(config) {
      resolvedConfig = config;
    },
    transformIndexHtml(html) {
      if (!resolvedConfig || resolvedConfig.command !== 'serve') return html;
      const devIconVersion = readDevPersistedIconVersion(resolvedConfig.root);
      return devIconVersion ? stampIconQueryInHtml(html, devIconVersion) : html;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url || '').split('?')[0];
        if (pathname.endsWith('/version.json')) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.end(JSON.stringify({ buildId, builtAt }));
          return;
        }
        next();
      });
    },
    async closeBundle() {
      if (!resolvedConfig || resolvedConfig.command !== 'build') return;

      const projectRoot = resolvedConfig.root;
      const outDir = path.resolve(projectRoot, resolvedConfig.build.outDir);
      const outIconsDir = path.join(outDir, 'icons');
      fs.mkdirSync(outIconsDir, { recursive: true });

      // 0. Regenerar los 4 iconos PWA oficiales desde el logo de plantilla corporativa
      // Prioridad: data/pwa-icons.json -> data/header-config.json -> public/company_logo.*
      let wroteGeneratedIcons = false;
      const persistedIconsPath = path.join(projectRoot, 'data', 'pwa-icons.json');
      if (fs.existsSync(persistedIconsPath)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(persistedIconsPath, 'utf-8'));
          const b180 = decodeImageDataUrl(parsed?.icon180 || '');
          const b192 = decodeImageDataUrl(parsed?.icon192 || '');
          const b512 = decodeImageDataUrl(parsed?.icon512 || '');
          const bMask = decodeImageDataUrl(parsed?.iconMaskable512 || '');
          if (b180 && b192 && b512 && bMask) {
            fs.writeFileSync(path.join(outIconsDir, 'apple-touch-icon.png'), b180);
            fs.writeFileSync(path.join(outIconsDir, 'icon-192.png'), b192);
            fs.writeFileSync(path.join(outIconsDir, 'icon-512.png'), b512);
            fs.writeFileSync(path.join(outIconsDir, 'icon-maskable-512.png'), bMask);
            wroteGeneratedIcons = true;
          }
        } catch {
          // Continuar a generación desde logo
        }
      }

      if (!wroteGeneratedIcons) {
        const companyLogoBuf = resolveProjectCompanyLogoBuffer(projectRoot);
        if (companyLogoBuf) {
          try {
            const generated = await generatePwaIconsFromBuffer(companyLogoBuf);
            fs.writeFileSync(path.join(outIconsDir, 'apple-touch-icon.png'), generated.icon180);
            fs.writeFileSync(path.join(outIconsDir, 'icon-192.png'), generated.icon192);
            fs.writeFileSync(path.join(outIconsDir, 'icon-512.png'), generated.icon512);
            fs.writeFileSync(path.join(outIconsDir, 'icon-maskable-512.png'), generated.iconMaskable512);
          } catch (err) {
            console.warn('[pwa-auto-sync-version] No se pudieron regenerar los iconos desde company_logo:', err);
          }
        }
      }

      // 1. Calcular hash de contenido de los iconos finales para invalidación automática de caché PWA
      const hash = crypto.createHash('sha256');
      const iconFiles = [
        'icons/apple-touch-icon.png',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/icon-maskable-512.png',
        'company_logo.jpg',
      ];
      let hasIconFile = false;
      for (const rel of iconFiles) {
        const full = path.join(outDir, rel);
        if (fs.existsSync(full)) {
          hash.update(fs.readFileSync(full));
          hasIconFile = true;
        }
      }
      const iconHash = hasIconFile ? hash.digest('hex').slice(0, 10) : buildId.slice(0, 10);

      // 2. Emitir version.json único en cada compilación para sincronización en tiempo real
      const versionFilePath = path.join(outDir, 'version.json');
      fs.writeFileSync(
        versionFilePath,
        JSON.stringify({ buildId, builtAt, iconHash }, null, 2),
        'utf-8'
      );

      // 3. Estampar la versión única en dist/sw.js para que el navegador detecte el cambio byte a byte
      const swFilePath = path.join(outDir, 'sw.js');
      if (fs.existsSync(swFilePath)) {
        const swContent = fs.readFileSync(swFilePath, 'utf-8');
        const updatedSw = swContent.replace(/__SW_CACHE_VERSION__/g, buildId);
        fs.writeFileSync(swFilePath, updatedSw, 'utf-8');
      }

      // 4. Estampar ?icon=<hash> en dist/manifest.webmanifest para forzar actualización del icono en Android/Desktop
      const manifestPath = path.join(outDir, 'manifest.webmanifest');
      if (fs.existsSync(manifestPath)) {
        try {
          const manifestJson = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
          if (Array.isArray(manifestJson.icons)) {
            manifestJson.icons = manifestJson.icons.map((icon: { src?: string }) => {
              if (typeof icon.src === 'string') {
                const cleanSrc = icon.src.split('?')[0];
                return { ...icon, src: `${cleanSrc}?icon=${iconHash}` };
              }
              return icon;
            });
          }
          fs.writeFileSync(manifestPath, JSON.stringify(manifestJson, null, 2), 'utf-8');
        } catch {
          // Mantener manifest original si ocurre un error de parseo
        }
      }

      // 5. Estampar ?icon=<hash> en dist/index.html (apple-touch-icon, icons y manifest)
      const indexHtmlPath = path.join(outDir, 'index.html');
      if (fs.existsSync(indexHtmlPath)) {
        const html = fs.readFileSync(indexHtmlPath, 'utf-8');
        fs.writeFileSync(indexHtmlPath, stampIconQueryInHtml(html, iconHash), 'utf-8');
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const base = resolveBasePath(mode);
  const buildId = resolveBuildId();
  const builtAt = new Date().toISOString();

  return {
    base,
    define: {
      __APP_BUILD_ID__: JSON.stringify(buildId),
      __APP_BUILT_AT__: JSON.stringify(builtAt),
    },
    plugins: [react(), pwaAutoSyncPlugin(buildId, builtAt)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

