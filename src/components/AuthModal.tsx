import React from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { useCloudSync } from './CloudSyncContext';
import { FirebaseLoginForm } from './FirebaseLoginForm';

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal } = useCloudSync();

  if (!isAuthModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Inicio de sesión en la nube"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 flex flex-col">
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-brand-700/40 border border-brand-500/40 flex items-center justify-center shrink-0">
              <ShieldCheck size={17} className="text-brand-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold truncate">Cuenta SG-SST en la Nube</h2>
              <p className="text-[11px] text-slate-400 truncate">
                Autenticación Firebase para historial y directorio
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeAuthModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Cerrar inicio de sesión"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto max-h-[82vh]">
          <FirebaseLoginForm onSuccess={closeAuthModal} />
        </div>
      </div>
    </div>
  );
}
