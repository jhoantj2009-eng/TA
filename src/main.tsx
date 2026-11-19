/// <reference types="vite/client" />
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppRouter } from './components/AppRouter';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CloudSyncProvider } from './components/CloudSyncContext';
import './hooks/usePWAInstall';
import { registerAppServiceWorker } from './hooks/useAutoAppUpdate';
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

registerAppServiceWorker();

