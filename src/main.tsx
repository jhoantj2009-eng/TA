/// <reference types="vite/client" />
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { AppRouter } from './components/AppRouter';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CloudSyncProvider } from './components/CloudSyncContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <CloudSyncProvider>
        <AppRouter />
      </CloudSyncProvider>
    </ErrorBoundary>
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    try {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    } catch {
      // Ignorar errores de registro del service worker
    }
  });
}
