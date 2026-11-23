import React, { useEffect, useState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import { User } from 'firebase/auth';
import { FirebaseLoginForm } from './FirebaseLoginForm';
import { PWAInstallButton } from './PWAInstallButton';
import {
  COMPANY_LOGO_UPDATED_EVENT,
  CompanyLogoUpdateDetail,
  getActiveCompanyLogoFromStorage,
} from '../utils/dynamicPwaIcon';

interface LoginPageProps {
  onAuthenticated?: (user: User) => void;
}

export function LoginPage({ onAuthenticated }: LoginPageProps) {
  const [brand, setBrand] = useState(() => getActiveCompanyLogoFromStorage());

  useEffect(() => {
    const handleBrandUpdate = (event: Event) => {
      const custom = event as CustomEvent<CompanyLogoUpdateDetail>;
      const fallback = getActiveCompanyLogoFromStorage();
      setBrand({
        logo: custom.detail?.logo !== undefined ? custom.detail.logo : fallback.logo,
        companyName: custom.detail?.companyName || fallback.companyName,
      });
    };

    window.addEventListener(COMPANY_LOGO_UPDATED_EVENT, handleBrandUpdate);
    return () => {
      window.removeEventListener(COMPANY_LOGO_UPDATED_EVENT, handleBrandUpdate);
    };
  }, []);

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Subtle architectural background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b25_1px,transparent_1px),linear-gradient(to_bottom,#1e293b25_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
        {/* Institutional Header con logotipo corporativo de la plantilla activa */}
        <div className="bg-slate-900 px-6 py-5 text-center border-b border-slate-800">
          {brand.logo ? (
            <div className="w-16 h-16 mx-auto rounded-2xl bg-white p-1.5 border border-slate-200/80 flex items-center justify-center mb-3 shadow-md overflow-hidden">
              <img
                src={brand.logo}
                alt={brand.companyName || 'Logo de la empresa'}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-12 h-12 mx-auto rounded-xl bg-brand-700/30 border border-brand-500/40 flex items-center justify-center text-brand-300 mb-3 shadow-sm">
              <Lock size={22} />
            </div>
          )}
          <p className="text-[10px] font-bold uppercase tracking-widest text-brand-300 mb-1">
            {brand.companyName || 'Control de Acceso SG-SST'}
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
            showRegisterOption={false}
          />
        </div>

        {/* Security Footer & Optional PWA Install Action */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col gap-2.5">
          <PWAInstallButton variant="login" />
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
            <span>Sesión protegida mediante Firebase Authentication</span>
          </div>
        </div>
      </div>
    </div>
  );
}
