import React from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import { User } from 'firebase/auth';
import { FirebaseLoginForm } from './FirebaseLoginForm';

interface LoginPageProps {
  onAuthenticated?: (user: User) => void;
}

export function LoginPage({ onAuthenticated }: LoginPageProps) {
  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Subtle architectural background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b25_1px,transparent_1px),linear-gradient(to_bottom,#1e293b25_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
        {/* Institutional Header */}
        <div className="bg-slate-900 px-6 py-5 text-center border-b border-slate-800">
          <div className="w-12 h-12 mx-auto rounded-xl bg-brand-700/30 border border-brand-500/40 flex items-center justify-center text-brand-300 mb-3 shadow-sm">
            <Lock size={22} />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-brand-300 mb-1">
            Control de Acceso SG-SST
          </p>
          <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
            Permiso de Trabajo en Alturas
          </h1>
          <p className="text-[11px] text-slate-400 mt-1">
            Resolución 4272 de 2021 · Acceso restringido a personal autenticado
          </p>
        </div>

        {/* Isolated Login Form — no access to app features until credentials are validated */}
        <div className="p-6 sm:p-7">
          <FirebaseLoginForm
            title="Iniciar sesión"
            subtitle="Valida tus credenciales para acceder al formulario oficial, historial de permisos y directorio de personal."
            onSuccess={onAuthenticated}
            showGoogleOption={false}
          />
        </div>

        {/* Security Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
          <span>Sesión protegida mediante Firebase Authentication</span>
        </div>
      </div>
    </div>
  );
}
