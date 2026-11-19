import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

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

export default defineConfig(({ mode }) => {
  const base = resolveBasePath(mode);

  return {
    base,
    plugins: [react()],
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
