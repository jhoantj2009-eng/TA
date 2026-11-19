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

function normalizeUploadedLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen del logo'));
    reader.onloadend = () => {
      const rawDataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!rawDataUrl) {
        reject(new Error('Imagen vacía'));
        return;
      }

      // Mantener SVG o imágenes livianas directamente si ya son compactas
      if (file.type === 'image/svg+xml' || rawDataUrl.length <= 160_000) {
        resolve(rawDataUrl);
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const maxSide = 800;
          const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
          const w = Math.max(1, Math.round((img.naturalWidth || maxSide) * scale));
          const h = Math.max(1, Math.round((img.naturalHeight || maxSide) * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawDataUrl);
            return;
          }
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, w, h);
          const outputType = file.type === 'image/png' || file.type === 'image/webp' ? 'image/png' : 'image/jpeg';
          const compressed = canvas.toDataURL(outputType, 0.9);
          resolve(compressed.length < rawDataUrl.length ? compressed : rawDataUrl);
        } catch {
          resolve(rawDataUrl);
        }
      };
      img.onerror = () => resolve(rawDataUrl);
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function Header({ data, updateData, pageNum = 1, totalPages = 2, isUnified = false, onNotify }: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const logoDataUrl = await normalizeUploadedLogo(file);
        updateData({ companyLogo: logoDataUrl });
        saveStoredHeaderConfig({ logo: logoDataUrl });
        onNotify?.("¡Logo cambiado y fijado con éxito! Se mostrará a quien abra el enlace compartido.");
      } catch {
        onNotify?.("No se pudo procesar la imagen seleccionada. Intenta con un archivo PNG o JPG.");
      }
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="mb-2.5 avoid-break">
      {/* Encabezado Institucional en Tabla Estructurada con Bordes Sólidos (sin rowSpan para evitar desfasaje en PDF) */}
      <table className="header-official-table w-full border-collapse border-2 border-black bg-white text-[11px]">
        <colgroup>
          <col style={{ width: '24%' }} />
          <col style={{ width: '50%' }} />
          <col style={{ width: '26%' }} />
        </colgroup>
        <tbody>
          <tr>
            {/* Logo Corporativo */}
            <td className="border border-black p-2 text-center align-middle bg-white">
              <div className="flex items-center justify-center min-h-[92px]">
                {data.companyLogo ? (
                  <div
                    onClick={handleTriggerUpload}
                    className="cursor-pointer relative group/img flex items-center justify-center p-1 rounded hover:bg-slate-50 transition-colors w-full min-h-[84px]"
                    title="Haga clic para cambiar la imagen del logo"
                  >
                    <img
                      src={data.companyLogo}
                      alt="Logo Empresa"
                      data-pdf-logo="true"
                      loading="eager"
                      decoding="sync"
                      className="max-h-20 max-w-full object-contain mx-auto block"
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
                    <Upload size={20} className="text-brand-700 mb-1" />
                    <span className="text-xs font-bold text-slate-800">Subir Logo Empresa</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">PNG, JPG o SVG</span>
                  </button>
                )}

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
            </td>

            {/* Título del Sistema de Gestión */}
            <td className="border border-black px-3 py-2 text-center align-middle bg-white">
              <div className="uppercase text-[11px] sm:text-xs text-slate-800 font-bold tracking-tight leading-snug">
                SISTEMA DE GESTIÓN DE LA SEGURIDAD Y SALUD EN EL TRABAJO
              </div>
              <div className="text-sm sm:text-base mt-1 uppercase tracking-wide text-black font-black leading-snug">
                FORMATO DE PERMISO DE TRABAJO EN ALTURAS
              </div>
            </td>

            {/* Bloque de Metadatos en 4 filas alineadas */}
            <td className="border border-black p-0 align-middle bg-white h-full">
              <div className="flex flex-col divide-y divide-black h-full">
                {/* Fila 1: Código */}
                <div className="flex items-stretch min-h-[26px] flex-1">
                  <div className="w-[36%] px-1.5 py-1 font-bold text-[10px] text-slate-900 bg-brand-50/70 border-r border-black flex items-center justify-center leading-snug">
                    Código
                  </div>
                  <div className="w-[64%] px-1.5 py-0.5 flex items-center justify-center">
                    <input
                      type="text"
                      value={data.documentCode}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateData({ documentCode: val });
                        saveStoredHeaderConfig({ code: val });
                      }}
                      className="w-full text-center outline-none bg-transparent font-mono text-[10.5px] font-bold text-black leading-snug py-0.5"
                      placeholder="F-SST-045"
                      title="Haga clic para modificar el código del formato"
                    />
                  </div>
                </div>

                {/* Fila 2: Versión */}
                <div className="flex items-stretch min-h-[26px] flex-1">
                  <div className="w-[36%] px-1.5 py-1 font-bold text-[10px] text-slate-900 bg-brand-50/70 border-r border-black flex items-center justify-center leading-snug">
                    Versión
                  </div>
                  <div className="w-[64%] px-1.5 py-0.5 flex items-center justify-center">
                    <input
                      type="text"
                      value={data.documentVersion}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateData({ documentVersion: val });
                        saveStoredHeaderConfig({ version: val });
                      }}
                      className="w-full text-center outline-none bg-transparent font-mono text-[10.5px] font-bold text-black leading-snug py-0.5"
                      placeholder="01"
                      title="Haga clic para modificar la versión del formato"
                    />
                  </div>
                </div>

                {/* Fila 3: Vigencia */}
                <div className="flex items-stretch min-h-[26px] flex-1">
                  <div className="w-[36%] px-1.5 py-1 font-bold text-[10px] text-slate-900 bg-brand-50/70 border-r border-black flex items-center justify-center leading-snug">
                    Vigencia
                  </div>
                  <div className="w-[64%] px-1.5 py-0.5 flex items-center justify-center">
                    <input
                      type="text"
                      value={data.documentValidity}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateData({ documentValidity: val });
                        saveStoredHeaderConfig({ validity: val });
                      }}
                      className="w-full text-center outline-none bg-transparent font-mono text-[10.5px] font-bold text-black leading-snug py-0.5"
                      placeholder="JUNIO 2021"
                      title="Haga clic para modificar la fecha de vigencia"
                    />
                  </div>
                </div>

                {/* Fila 4: Página */}
                <div className="flex items-stretch min-h-[26px] flex-1">
                  <div className="w-[36%] px-1.5 py-1 font-bold text-[10px] text-slate-900 bg-brand-50/70 border-r border-black flex items-center justify-center leading-snug">
                    Página
                  </div>
                  <div className="w-[64%] px-1.5 py-1 flex items-center justify-center font-bold text-[10.5px] text-black font-mono leading-snug">
                    {isUnified ? '1 de 1 (Unificado)' : `Pág. ${pageNum} de ${totalPages}`}
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
