import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv, type Plugin, type ResolvedConfig } from 'vite';

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

function pwaAutoSyncPlugin(buildId: string, builtAt: string): Plugin {
  let resolvedConfig: ResolvedConfig | null = null;

  return {
    name: 'pwa-auto-sync-version',
    configResolved(config) {
      resolvedConfig = config;
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
    closeBundle() {
      if (!resolvedConfig || resolvedConfig.command !== 'build') return;

      const outDir = path.resolve(resolvedConfig.root, resolvedConfig.build.outDir);

      // 1. Emitir version.json único en cada compilación para sincronización en tiempo real
      const versionFilePath = path.join(outDir, 'version.json');
      fs.writeFileSync(
        versionFilePath,
        JSON.stringify({ buildId, builtAt }, null, 2),
        'utf-8'
      );

      // 2. Estampar la versión única en dist/sw.js para que el navegador detecte el cambio byte a byte
      const swFilePath = path.join(outDir, 'sw.js');
      if (fs.existsSync(swFilePath)) {
        const swContent = fs.readFileSync(swFilePath, 'utf-8');
        const updatedSw = swContent.replace(/__SW_CACHE_VERSION__/g, buildId);
        fs.writeFileSync(swFilePath, updatedSw, 'utf-8');
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

