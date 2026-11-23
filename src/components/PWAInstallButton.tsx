import React, { useEffect, useState } from 'react';
import { Download, Share, PlusSquare, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  COMPANY_LOGO_UPDATED_EVENT,
  CompanyLogoUpdateDetail,
  getActiveCompanyLogoFromStorage,
} from '../utils/dynamicPwaIcon';

interface PWAInstallButtonProps {
  variant?: 'header' | 'login';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, installing, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
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

  // Si la app ya se ejecuta instalada en modo standalone, ocultar el botón
  if (isInstalled) {
    return null;
  }

  const buttonClasses =
    variant === 'login'
      ? `w-full min-h-[38px] px-3 py-2 rounded-lg text-xs font-semibold bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200 flex items-center justify-center gap-2 transition-colors cursor-pointer ${className}`
      : `print:hidden min-h-[38px] sm:min-h-[34px] px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 hover:text-white border border-slate-600 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${className}`;

  // Flujo Android / Windows / Mac / Linux (Chromium & Edge)
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        disabled={installing}
        title="Instalar Permiso de Trabajo en Alturas como aplicación"
        className={buttonClasses}
      >
        {variant === 'login' ? (
          <Download size={14} className="shrink-0" />
        ) : (
          <Smartphone size={14} className="text-brand-300 shrink-0" />
        )}
        <span>{installing ? 'Instalando...' : 'Instalar App'}</span>
      </button>
    );
  }

  // Flujo iOS / iPadOS Safari (WebKit no emite beforeinstallprompt)
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          title="Cómo instalar esta aplicación en iPhone o iPad"
          className={buttonClasses}
        >
          <Smartphone size={14} className={variant === 'login' ? 'shrink-0' : 'text-brand-300 shrink-0'} />
          <span>Instalar App</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 print:hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-pwa-guide-title"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 p-5 shadow-2xl text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  {brand.logo ? (
                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm p-1.5 flex items-center justify-center shrink-0 overflow-hidden">
                      <img
                        src={brand.logo}
                        alt="Ícono de la aplicación"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-700 shrink-0">
                      <Smartphone size={18} />
                    </div>
                  )}
                  <div>
                    <h3
                      id="ios-pwa-guide-title"
                      className="text-sm font-bold text-slate-900 leading-tight"
                    >
                      Instalar en iPhone / iPad
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Se instalará con el logo de {brand.companyName || 'la empresa'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Cerrar instrucciones"
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <ol className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <Share size={15} className="text-brand-700 shrink-0 mt-0.5" />
                  <span>
                    1. En Safari, toca el botón <strong>Compartir</strong> en la barra inferior o superior.
                  </span>
                </li>
                <li className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <PlusSquare size={15} className="text-brand-700 shrink-0 mt-0.5" />
                  <span>
                    2. Desplázate y selecciona <strong>Agregar a inicio</strong> (<em>Add to Home Screen</em>).
                  </span>
                </li>
              </ol>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full min-h-[38px] rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
