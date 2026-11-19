import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import App from '../App';
import { auth } from '../firebase';
import { useCloudSync } from './CloudSyncContext';
import { LoginPage } from './LoginPage';
import { OfflineIndicator } from './OfflineIndicator';

const LOGIN_ROUTE = '/login';
const HOME_ROUTE = '/';

function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') return HOME_ROUTE;
  return pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
}

function getInitialSafePath(): string {
  if (typeof window === 'undefined') return LOGIN_ROUTE;
  const current = normalizePath(window.location.pathname);
  // Verificación síncrona inmediata al cargar: si aún no hay usuario activo en Firebase,
  // evitar exponer rutas protegidas en la barra de dirección hasta validar la sesión.
  if (!auth.currentUser && current !== LOGIN_ROUTE) {
    return current;
  }
  return current;
}

export function AppRouter() {
  const { user, authReady } = useCloudSync();
  const [pathname, setPathname] = useState<string>(() => getInitialSafePath());

  const navigateReplace = (targetPath: string) => {
    const normalized = normalizePath(targetPath);
    if (typeof window !== 'undefined' && normalizePath(window.location.pathname) !== normalized) {
      window.history.replaceState(null, '', normalized);
    }
    setPathname(normalized);
  };

  useEffect(() => {
    const handlePopState = () => {
      const nextPath = normalizePath(window.location.pathname);
      if (!auth.currentUser && nextPath !== LOGIN_ROUTE) {
        window.history.replaceState(null, '', LOGIN_ROUTE);
        setPathname(LOGIN_ROUTE);
        return;
      }
      if (auth.currentUser && nextPath === LOGIN_ROUTE) {
        window.history.replaceState(null, '', HOME_ROUTE);
        setPathname(HOME_ROUTE);
        return;
      }
      setPathname(nextPath);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sincronización inmediata antes de pintar (useLayoutEffect) para redirigir sin destellos
  useLayoutEffect(() => {
    if (!authReady) return;

    const isVerified = Boolean(user && auth.currentUser);
    if (!isVerified) {
      if (pathname !== LOGIN_ROUTE || normalizePath(window.location.pathname) !== LOGIN_ROUTE) {
        navigateReplace(LOGIN_ROUTE);
      }
    } else if (pathname === LOGIN_ROUTE || normalizePath(window.location.pathname) === LOGIN_ROUTE) {
      navigateReplace(HOME_ROUTE);
    }
  }, [authReady, user, pathname]);

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
  if (!isVerified || pathname === LOGIN_ROUTE) {
    if (!isVerified && typeof window !== 'undefined' && normalizePath(window.location.pathname) !== LOGIN_ROUTE) {
      window.history.replaceState(null, '', LOGIN_ROUTE);
    }
    return (
      <>
        <LoginPage onAuthenticated={() => navigateReplace(HOME_ROUTE)} />
        <OfflineIndicator />
      </>
    );
  }

  // 3. Credenciales validadas: habilitar el acceso completo al formulario y funciones de la aplicación
  return (
    <>
      <App />
      <OfflineIndicator />
    </>
  );
}
