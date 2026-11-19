import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="print:hidden fixed bottom-4 left-4 z-[9990] flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white shadow-lg border border-amber-500"
    >
      <WifiOff size={14} className="shrink-0" />
      <span>Modo sin conexión — Usando datos locales y caché offline</span>
    </div>
  );
};
