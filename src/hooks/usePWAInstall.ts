import { useCallback, useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms?: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt: () => Promise<void>;
}

// Almacenamiento global del evento beforeinstallprompt para no perderlo si se dispara
// antes de que el usuario inicie sesión y monte la aplicación principal.
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
let globalIsInstalled = false;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function detectStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function detectIOSDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  const isClassicIOS = /iphone|ipad|ipod/.test(ua);
  // iPadOS 13+ reporta Macintosh en userAgent pero cuenta con pantalla táctil
  const isIPadOS =
    window.navigator.platform === 'MacIntel' && (window.navigator.maxTouchPoints || 0) > 1;
  return isClassicIOS || isIPadOS;
}

if (typeof window !== 'undefined') {
  globalIsInstalled = detectStandaloneMode();

  window.addEventListener('beforeinstallprompt', (event: Event) => {
    event.preventDefault();
    globalDeferredPrompt = event as BeforeInstallPromptEvent;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    globalIsInstalled = true;
    globalDeferredPrompt = null;
    notifyListeners();
  });

  const displayModeQuery = window.matchMedia('(display-mode: standalone)');
  if (typeof displayModeQuery.addEventListener === 'function') {
    displayModeQuery.addEventListener('change', (e) => {
      if (e.matches) {
        globalIsInstalled = true;
        globalDeferredPrompt = null;
        notifyListeners();
      }
    });
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => globalDeferredPrompt
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(() => globalIsInstalled);
  const [isIOS] = useState<boolean>(() => detectIOSDevice());
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const syncState = () => {
      setDeferredPrompt(globalDeferredPrompt);
      setIsInstalled(globalIsInstalled || detectStandaloneMode());
    };

    listeners.add(syncState);
    syncState();

    return () => {
      listeners.delete(syncState);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    if (!globalDeferredPrompt) return false;
    setInstalling(true);
    try {
      await globalDeferredPrompt.prompt();
      const { outcome } = await globalDeferredPrompt.userChoice;
      if (outcome === 'accepted') {
        globalIsInstalled = true;
        globalDeferredPrompt = null;
        notifyListeners();
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setInstalling(false);
    }
  }, []);

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    installing,
    install,
  };
}

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
