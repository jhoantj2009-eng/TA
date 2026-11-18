import React, { ChangeEvent, useRef } from 'react';
import { Upload, RefreshCw } from 'lucide-react';
import { PermitData } from '../types';
import { saveStoredHeaderConfig } from '../defaultLogo';

interface HeaderProps {
  data: PermitData;
  updateData: (data: Partial<PermitData>) => void;
  pageNum?: number;
  totalPages?: number;
  isUnified?: boolean;
  onNotify?: (message: string) => void;
}

export function Header({ data, updateData, pageNum = 1, totalPages = 2, isUnified = false, onNotify }: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const logoDataUrl = reader.result as string;
        updateData({ companyLogo: logoDataUrl });
        saveStoredHeaderConfig({ logo: logoDataUrl });
        onNotify?.("¡Logo cambiado y fijado con éxito! Se mostrará a quien abra el enlace compartido.");
      };
      reader.readAsDataURL(file);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col mb-4">
      {/* Encabezado Oficial del Formato */}
      <div className="header-official-table border-2 border-black flex flex-col md:flex-row text-sm bg-white">
        {/* Logo Section */}
        <div className="w-full md:w-1/4 border-b-2 md:border-b-0 md:border-r-2 border-black flex flex-col items-center justify-center p-2.5 min-h-[110px] relative group bg-white">
          {data.companyLogo ? (
            <div 
              onClick={handleTriggerUpload}
              className="cursor-pointer relative group/img flex items-center justify-center p-1 rounded hover:bg-slate-50 transition-colors w-full h-full"
              title="Haga clic para cambiar la imagen del logo"
            >
              <img 
                src={data.companyLogo} 
                alt="Logo Empresa" 
                className="max-h-20 max-w-full object-contain" 
              />
              <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover/img:opacity-100 flex items-center justify-center rounded transition-opacity print:hidden">
                <span className="bg-slate-900/80 text-white text-[9px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                  <RefreshCw size={9} /> Cambiar
                </span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleTriggerUpload}
              className="text-slate-500 hover:text-brand-800 flex flex-col items-center justify-center p-2 w-full h-full border border-dashed border-slate-300 hover:border-brand-500 rounded bg-slate-50/50 hover:bg-brand-50/50 transition-colors print:hidden"
            >
              <Upload size={22} className="text-brand-700 mb-1" />
              <span className="text-xs font-bold text-slate-800">Subir Logo Empresa</span>
              <span className="text-[10px] text-slate-500 mt-0.5">PNG, JPG o SVG</span>
            </button>
          )}

          {/* Vista previa en impresión si no hay logo */}
          {!data.companyLogo && (
            <div className="hidden print:flex flex-col items-center justify-center text-center p-2 text-xs font-bold text-gray-700">
              <span>[ LOGO EMPRESA ]</span>
            </div>
          )}

          <input 
            ref={fileInputRef}
            type="file" 
            accept="image/*" 
            onChange={handleLogoUpload}
            className="hidden" 
            title="Seleccionar archivo de imagen"
          />
        </div>

        {/* Title Section */}
        <div className="w-full md:w-2/4 border-b-2 md:border-b-0 md:border-r-2 border-black flex flex-col justify-center items-center p-2 text-center font-bold bg-white">
          <div className="uppercase text-xs md:text-sm text-gray-800 tracking-tight">SISTEMA DE GESTIÓN DE LA SEGURIDAD Y SALUD EN EL TRABAJO</div>
          <div className="text-base md:text-lg mt-0.5 uppercase tracking-wide text-gray-950 font-black">FORMATO DE PERMISO DE TRABAJO EN ALTURAS</div>
        </div>

        {/* Meta Section (Código, Versión, Vigencia) */}
        <div className="w-full md:w-1/4 flex flex-col bg-white">
          <div className="flex border-b border-black flex-1">
            <div className="w-1/3 p-0.5 font-semibold border-r border-black flex items-center justify-center text-[10px] bg-brand-50/70">Código</div>
            <div className="w-2/3 flex items-center justify-center">
              <input
                type="text"
                value={data.documentCode}
                onChange={(e) => {
                  const val = e.target.value;
                  updateData({ documentCode: val });
                  saveStoredHeaderConfig({ code: val });
                }}
                className="w-full text-center outline-none bg-transparent font-mono text-[10px] font-bold px-1"
                placeholder="F-SST-045"
                title="Haga clic para modificar el código del formato"
              />
            </div>
          </div>
          <div className="flex border-b border-black flex-1">
            <div className="w-1/3 p-0.5 font-semibold border-r border-black flex items-center justify-center text-[10px] bg-brand-50/70">Versión</div>
            <div className="w-2/3 flex items-center justify-center">
              <input
                type="text"
                value={data.documentVersion}
                onChange={(e) => {
                  const val = e.target.value;
                  updateData({ documentVersion: val });
                  saveStoredHeaderConfig({ version: val });
                }}
                className="w-full text-center outline-none bg-transparent font-mono text-[10px] font-bold px-1"
                placeholder="01"
                title="Haga clic para modificar la versión del formato"
              />
            </div>
          </div>
          <div className="flex border-b border-black flex-1">
            <div className="w-1/3 p-0.5 font-semibold border-r border-black flex items-center justify-center text-center leading-tight text-[10px] bg-brand-50/70">Vigencia</div>
            <div className="w-2/3 flex items-center justify-center">
               <input
                type="text"
                value={data.documentValidity}
                onChange={(e) => {
                  const val = e.target.value;
                  updateData({ documentValidity: val });
                  saveStoredHeaderConfig({ validity: val });
                }}
                className="w-full text-center outline-none bg-transparent font-mono text-[10px] font-bold px-1"
                placeholder="JUNIO 2021"
                title="Haga clic para modificar la fecha de vigencia"
              />
            </div>
          </div>
          <div className="flex flex-1">
            <div className="w-1/3 p-0.5 font-semibold border-r border-black flex items-center justify-center text-center leading-tight text-[10px] bg-brand-50/70">Página</div>
            <div className="w-2/3 flex items-center justify-center font-bold text-[10px] text-slate-900 font-mono">
              {isUnified ? '1 de 1 (Unificado)' : `Pág. ${pageNum} de ${totalPages}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

