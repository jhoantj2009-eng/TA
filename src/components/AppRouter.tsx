import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import App from '../App';
import { auth } from '../firebase';
import { useCloudSync } from './CloudSyncContext';
import { LoginPage } from './LoginPage';
import { OfflineIndicator } from './OfflineIndicator';
import { useAutoAppUpdate } from '../hooks/useAutoAppUpdate';

type RouteKey = 'login' | 'home';

function getBasePath(): string {
  const rawBase = import.meta.env.BASE_URL || '/';
  return rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
}

function getRouteUrl(route: RouteKey): string {
  const basePath = getBasePath();
  return route === 'login' ? `${basePath}#/login` : basePath;
}

function detectCurrentRoute(): RouteKey {
  if (typeof window === 'undefined') return 'login';
  const hash = window.location.hash.replace(/^#/, '');
  const pathname = window.location.pathname;
  if (hash === '/login' || hash === 'login' || pathname.endsWith('/login')) {
    return 'login';
  }
  return 'home';
}

export function AppRouter() {
  const { user, authReady } = useCloudSync();
  const [route, setRoute] = useState<RouteKey>(() => detectCurrentRoute());
  const { isUpdating } = useAutoAppUpdate();

  const updateNotice = isUpdating ? (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[120] print:hidden bg-slate-900 text-white border border-brand-500/40 shadow-xl rounded-xl px-4 py-2.5 flex items-center gap-2.5 text-xs font-semibold"
      role="status"
      aria-live="polite"
    >
      <Loader2 size={14} className="animate-spin text-brand-400 shrink-0" />
      <span>Actualizando a la última versión...</span>
    </div>
  ) : null;

  const navigateReplace = (targetRoute: RouteKey) => {
    if (typeof window !== 'undefined') {
      const targetUrl = getRouteUrl(targetRoute);
      const currentUrl = `${window.location.pathname}${window.location.hash}`;
      if (currentUrl !== targetUrl) {
        window.history.replaceState(null, '', targetUrl);
      }
    }
    setRoute(targetRoute);
  };

  useEffect(() => {
    const syncRoute = () => {
      const nextRoute = detectCurrentRoute();
      if (!auth.currentUser && nextRoute !== 'login') {
        navigateReplace('login');
        return;
      }
      if (auth.currentUser && nextRoute === 'login') {
        navigateReplace('home');
        return;
      }
      setRoute(nextRoute);
    };

    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
    };
  }, []);

  // Sincronización inmediata antes de pintar (useLayoutEffect) manteniendo siempre el pathname base
  // (ej. /TA/) y usando hash (#/login) para evitar errores 404 en GitHub Pages e iOS Safari.
  useLayoutEffect(() => {
    if (!authReady) return;

    const isVerified = Boolean(user && auth.currentUser);
    const targetRoute: RouteKey = isVerified ? 'home' : 'login';
    const targetUrl = getRouteUrl(targetRoute);
    const currentUrl =
      typeof window !== 'undefined' ? `${window.location.pathname}${window.location.hash}` : targetUrl;

    if (route !== targetRoute || currentUrl !== targetUrl) {
      navigateReplace(targetRoute);
    }
  }, [authReady, user, route]);

  // 1. Mientras Firebase valida la sesión persistida, bloquear completamente el acceso a la aplicación
  if (!authReady) {
    return (
      <div
        className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-6 text-white select-none"
        role="status"
        aria-live="polite"
      >
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl px-7 py-6 max-w-sm w-full flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand-700/30 border border-brand-500/40 flex items-center justify-center text-brand-300">
            <ShieldCheck size={24} />
          </div>
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Loader2 size={16} className="animate-spin text-brand-400" />
            <span>Verificando autenticación...</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Comprobando credenciales activas de Firebase antes de cargar el sistema SG-SST.
          </p>
        </div>
      </div>
    );
  }

  // 2. Verificación síncrona estricta: sin usuario autenticado en Firebase, nunca montar <App />
  const isVerified = Boolean(user && auth.currentUser);
  if (!isVerified || route === 'login') {
    if (!isVerified && typeof window !== 'undefined') {
      const loginUrl = getRouteUrl('login');
      if (`${window.location.pathname}${window.location.hash}` !== loginUrl) {
        window.history.replaceState(null, '', loginUrl);
      }
    }
    return (
      <>
        <LoginPage onAuthenticated={() => navigateReplace('home')} />
        <OfflineIndicator />
        {updateNotice}
      </>
    );
  }

  // 3. Credenciales validadas: habilitar el acceso completo al formulario y funciones de la aplicación
  return (
    <>
      <App />
      <OfflineIndicator />
      {updateNotice}
    </>
  );
}
