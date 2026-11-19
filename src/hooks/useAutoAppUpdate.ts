import { useEffect, useState } from 'react';

export const APP_BEFORE_UPDATE_RELOAD_EVENT = 'app:before-update-reload';

const VERSION_POLL_INTERVAL_MS = 30_000;
const MIN_CHECK_GAP_MS = 10_000;
const RELOAD_COOLDOWN_MS = 120_000;
const TARGET_BUILD_KEY = 'pwa_sync_target_build';
const TARGET_BUILD_AT_KEY = 'pwa_sync_target_build_at';

let swRegistration: ServiceWorkerRegistration | null = null;
let reloadInProgress = false;
let lastCheckTimestamp = 0;

const updatingListeners = new Set<(updating: boolean) => void>();

function notifyUpdating(updating: boolean) {
  updatingListeners.forEach((listener) => listener(updating));
}

function getNormalizedBaseUrl(): string {
  const baseUrl = import.meta.env.BASE_URL || '/';
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

function getCurrentBuildId(): string {
  return typeof __APP_BUILD_ID__ === 'string' ? __APP_BUILD_ID__ : '';
}

function shouldSkipReloadForBuild(targetBuildId: string): boolean {
  try {
    const previousTarget = sessionStorage.getItem(TARGET_BUILD_KEY);
    const previousAttemptAt = Number(sessionStorage.getItem(TARGET_BUILD_AT_KEY) || '0');
    if (
      previousTarget === targetBuildId &&
      Number.isFinite(previousAttemptAt) &&
      Date.now() - previousAttemptAt < RELOAD_COOLDOWN_MS
    ) {
      return true;
    }
  } catch {
    // sessionStorage puede no estar disponible en modos restringidos
  }
  return false;
}

function markReloadAttempt(targetBuildId: string) {
  try {
    sessionStorage.setItem(TARGET_BUILD_KEY, targetBuildId);
    sessionStorage.setItem(TARGET_BUILD_AT_KEY, String(Date.now()));
  } catch {
    // Ignorar errores de almacenamiento
  }
}

async function clearAppCaches() {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  try {
    const cacheKeys = await caches.keys();
    await Promise.all(
      cacheKeys
        .filter((key) => key.startsWith('permiso-alturas-'))
        .map((key) => caches.delete(key))
    );
  } catch {
    // Ignorar errores al limpiar caché
  }
}

async function triggerLiveReload(targetBuildId: string, purgeCaches: boolean) {
  if (reloadInProgress || typeof window === 'undefined') return;
  if (shouldSkipReloadForBuild(targetBuildId)) return;

  reloadInProgress = true;
  markReloadAttempt(targetBuildId);
  notifyUpdating(true);

  // Guardar borrador local de forma síncrona antes de recargar
  window.dispatchEvent(new Event(APP_BEFORE_UPDATE_RELOAD_EVENT));

  try {
    if (swRegistration) {
      await swRegistration.update().catch(() => undefined);
      if (swRegistration.waiting) {
        swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    }
    if (purgeCaches) {
      await clearAppCaches();
    }
  } finally {
    window.setTimeout(() => {
      window.location.reload();
    }, 450);
  }
}

function activateWaitingWorker(worker: ServiceWorker | null | undefined) {
  if (!worker) return;
  worker.postMessage({ type: 'SKIP_WAITING' });
}

export function registerAppServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  const hadControllerAtBoot = Boolean(navigator.serviceWorker.controller);

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!import.meta.env.PROD || !hadControllerAtBoot) return;
    triggerLiveReload(`sw-${Date.now()}`, false);
  });

  window.addEventListener('load', () => {
    const normalizedBase = getNormalizedBaseUrl();

    navigator.serviceWorker
      .register(`${normalizedBase}sw.js`, {
        scope: normalizedBase,
        updateViaCache: 'none',
      })
      .then((registration) => {
        swRegistration = registration;

        if (registration.waiting && navigator.serviceWorker.controller) {
          activateWaitingWorker(registration.waiting);
        }

        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (
              installingWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              activateWaitingWorker(installingWorker);
            }
          });
        });

        registration.update().catch(() => undefined);
      })
      .catch((error) => {
        console.warn('No se pudo registrar el Service Worker:', error);
      });
  });
}

async function checkForRemoteBuildUpdate(force = false) {
  if (!import.meta.env.PROD || typeof window === 'undefined') return;
  if (reloadInProgress || !navigator.onLine) return;

  const now = Date.now();
  if (!force && now - lastCheckTimestamp < MIN_CHECK_GAP_MS) return;
  lastCheckTimestamp = now;

  // Pedir también al Service Worker que revise cambios en sw.js
  if (swRegistration) {
    swRegistration.update().catch(() => undefined);
  }

  const currentBuildId = getCurrentBuildId();
  if (!currentBuildId) return;

  try {
    const versionUrl = `${getNormalizedBaseUrl()}version.json?t=${Date.now()}`;
    const response = await fetch(versionUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) return;

    const payload = (await response.json()) as { buildId?: string };
    const remoteBuildId = typeof payload?.buildId === 'string' ? payload.buildId.trim() : '';

    if (remoteBuildId && remoteBuildId !== currentBuildId) {
      await triggerLiveReload(remoteBuildId, true);
    }
  } catch {
    // Sin conexión temporal o despliegue en propagación: reintentará automáticamente en el próximo ciclo
  }
}

export function useAutoAppUpdate(): { isUpdating: boolean } {
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    updatingListeners.add(setIsUpdating);
    return () => {
      updatingListeners.delete(setIsUpdating);
    };
  }, []);

  useEffect(() => {
    if (!import.meta.env.PROD || typeof window === 'undefined') return;

    const initialTimer = window.setTimeout(() => {
      checkForRemoteBuildUpdate(true);
    }, 4000);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        checkForRemoteBuildUpdate(false);
      }
    }, VERSION_POLL_INTERVAL_MS);

    const handleResumeCheck = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        checkForRemoteBuildUpdate(false);
      }
    };

    const handleOnline = () => {
      checkForRemoteBuildUpdate(true);
    };

    document.addEventListener('visibilitychange', handleResumeCheck);
    window.addEventListener('focus', handleResumeCheck);
    window.addEventListener('pageshow', handleResumeCheck);
    window.addEventListener('online', handleOnline);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleResumeCheck);
      window.removeEventListener('focus', handleResumeCheck);
      window.removeEventListener('pageshow', handleResumeCheck);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return { isUpdating };
}
