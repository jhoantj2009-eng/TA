import React, { useState } from 'react';
import { Lock, KeyRound, ShieldAlert, ArrowRight, ShieldCheck } from 'lucide-react';
import { getStoredAccessCode, setAuthenticated } from '../utils/security';

interface AccessLockScreenProps {
  onUnlock: () => void;
}

export const AccessLockScreen: React.FC<AccessLockScreenProps> = ({ onUnlock }) => {
  const [code, setCode] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validCode = getStoredAccessCode();
    if (code.trim() === validCode.trim()) {
      setAuthenticated(remember);
      onUnlock();
    } else {
      setError('Código de acceso incorrecto. Verifique la clave e intente de nuevo.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-brand-500 selection:text-white">
      {/* Background Subtle Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div 
        id="access-lock-card" 
        className={`relative z-10 w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 text-white transition-transform duration-200 ${
          isShaking ? 'translate-x-1 duration-75 ease-in-out' : ''
        }`}
      >
        {/* Top Header Badge */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-700/25 mb-4 border border-brand-400/30">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <span className="text-[11px] font-bold tracking-widest uppercase bg-brand-950/90 text-brand-300 px-3 py-1 rounded-full border border-brand-700/60 mb-2">
            Control de Seguridad SG-SST
          </span>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Permiso de Trabajo en Alturas
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 max-w-xs">
            Resolución 4272 de 2021 — Ingrese el código de acceso autorizado para diligenciar o modificar permisos.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label 
              htmlFor="access-code-input" 
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
            >
              Código de Acceso
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                id="access-code-input"
                type="password"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (error) setError(null);
                }}
                autoFocus
                autoComplete="current-password"
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-xl text-sm text-white placeholder-slate-600 transition-all outline-none"
              />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div 
              id="access-error-alert" 
              className="flex items-center gap-2 p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-300 animate-fadeIn"
            >
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Remember checkbox */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
              <input
                id="remember-session-checkbox"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-brand-600 focus:ring-brand-500/30"
              />
              <span>Recordar en este dispositivo</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            id="submit-access-code-btn"
            className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-500 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-lg shadow-brand-700/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Desbloquear Formulario</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer Note */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Acceso seguro protegido por credenciales SG-SST</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Solicite la clave de acceso autorizada al Coordinador de Alturas o Responsable SST.
          </p>
        </div>
      </div>
    </div>
  );
};
