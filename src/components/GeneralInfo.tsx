import React from 'react';
import { PermitData } from '../types';
import { DateSelector, TimeSelector } from './DateTimeSelectors';

interface GeneralInfoProps {
  data: PermitData;
  updateData: (data: Partial<PermitData>) => void;
}

export function GeneralInfo({ data, updateData }: GeneralInfoProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    updateData({ [name]: value });
  };

  return (
    <div className="border border-slate-700 mb-2 bg-white shadow-2xs">
      {/* Header institucional estrictamente centrado y legible */}
      <div className="bg-brand-700 text-white font-bold py-1 px-2 text-[10.5px] sm:text-xs uppercase tracking-wider text-center relative border-b border-slate-700 flex items-center justify-center">
        <span>I. INFORMACIÓN GENERAL DEL PERMISO</span>
      </div>

      {/* Grid Uniforme con Bordes Completos y Cerrados */}
      <div className="w-full text-[9px] sm:text-[9.5px]">
        {/* Fila 1: Consecutivo y Ubicación (Res. 4272/2021 Numeral 10) */}
        <div className="grid grid-cols-1 sm:grid-cols-4 border-b border-slate-700 bg-brand-50/40">
          <div className="flex border-b sm:border-b-0 border-r-0 sm:border-r border-slate-700 items-stretch min-h-[28px]">
            <span className="w-32 sm:w-28 p-1 font-bold border-r border-slate-700 bg-brand-200/80 text-brand-950 flex items-center justify-center shrink-0 text-[9px] sm:text-[9.5px]">
              Permiso N°:
            </span>
            <input 
              type="text" 
              name="permitNumber" 
              value={data.permitNumber ?? ''} 
              onChange={handleChange} 
              className="flex-1 min-w-0 p-1 bg-white sm:bg-transparent outline-none font-black text-brand-950 text-center text-[10.5px] font-mono" 
              placeholder="001"
              title="Número consecutivo de permiso para trazabilidad de auditoría"
            />
          </div>
          <div className="sm:col-span-3 flex items-stretch min-h-[28px]">
            <span className="w-32 sm:w-24 p-1 font-semibold border-r border-slate-700 bg-brand-100/70 text-slate-800 flex items-center shrink-0 text-[9px] sm:text-[9.5px]">
              Lugar / Área:
            </span>
            <input 
              type="text" 
              name="location" 
              value={data.location ?? ''} 
              onChange={handleChange} 
              className="flex-1 min-w-0 p-1 px-2 bg-transparent outline-none font-semibold text-slate-900 text-[10px] sm:text-[10.5px]" 
              placeholder="Ej: Techo Bodega / Nave 2" 
            />
          </div>
        </div>

        {/* Fila 2: Fecha y Horas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 border-b border-slate-700 bg-brand-50/20">
          <div className="flex border-b sm:border-b-0 border-r-0 sm:border-r border-slate-700 items-stretch min-h-[26px]">
            <span className="w-32 sm:w-28 p-1 font-semibold border-r border-slate-700 bg-brand-100/70 text-slate-800 flex items-center shrink-0 text-[9px] sm:text-[9.5px]">
              Fecha Expedición:
            </span>
            <DateSelector
              value={data.date}
              onChange={(val) => updateData({ date: val })}
              ariaLabel="Fecha de Expedición"
              className="flex-1 p-1 px-1.5 font-bold text-slate-900 text-[10px] sm:text-[10.5px] min-w-0"
            />
          </div>
          <div className="flex border-b sm:border-b-0 border-r-0 md:border-r border-slate-700 items-stretch min-h-[26px]">
            <span className="w-32 sm:w-24 p-1 font-semibold border-r border-slate-700 bg-brand-100/70 text-slate-800 flex items-center shrink-0 text-[9px] sm:text-[9.5px]">
              Hora Inicio:
            </span>
            <TimeSelector
              value={data.startTime}
              onChange={(val) => updateData({ startTime: val })}
              ariaLabel="Hora de Inicio"
              className="flex-1 p-1 px-1.5 font-bold text-slate-900 text-[10px] sm:text-[10.5px] min-w-0"
            />
          </div>
          <div className="flex border-b sm:border-b-0 border-r-0 sm:border-r border-slate-700 items-stretch min-h-[26px]">
            <span className="w-32 sm:w-24 p-1 font-semibold border-r border-slate-700 bg-brand-100/70 text-slate-800 flex items-center shrink-0 text-[9px] sm:text-[9.5px]">
              Válido Hasta:
            </span>
            <DateSelector
              value={data.validUntil}
              onChange={(val) => updateData({ validUntil: val })}
              ariaLabel="Válido Hasta"
              className="flex-1 p-1 px-1.5 font-bold text-slate-900 text-[10px] sm:text-[10.5px] min-w-0"
            />
          </div>
          <div className="flex items-stretch min-h-[26px]">
            <span className="w-32 sm:w-24 p-1 font-semibold border-r border-slate-700 bg-brand-100/70 text-slate-800 flex items-center shrink-0 text-[9px] sm:text-[9.5px]">
              Hora Término:
            </span>
            <TimeSelector
              value={data.endTime}
              onChange={(val) => updateData({ endTime: val })}
              ariaLabel="Hora de Término"
              className="flex-1 p-1 px-1.5 font-bold text-slate-900 text-[10px] sm:text-[10.5px] min-w-0"
            />
          </div>
        </div>

        {/* Fila 3: Tipo de Trabajo y Altura Estimada */}
        <div className="grid grid-cols-1 md:grid-cols-3">
          <div className="md:col-span-2 flex flex-col sm:flex-row border-b md:border-b-0 border-r-0 md:border-r border-slate-700 items-stretch min-h-[26px]">
            <span className="w-full sm:w-28 p-1 font-semibold border-b sm:border-b-0 sm:border-r border-slate-700 bg-brand-100/70 text-slate-800 flex items-center shrink-0 text-[9px] sm:text-[9.5px]">
              Tipo de Trabajo:
            </span>
            <input 
              type="text" 
              name="workType" 
              value={data.workType} 
              onChange={handleChange} 
              className="flex-1 p-1 px-2 bg-transparent outline-none font-semibold text-slate-900 text-[10px] sm:text-[10.5px]" 
              placeholder="Ej: Mantenimiento de cubierta / Instalación eléctrica en postes" 
            />
          </div>
          <div className="flex flex-col sm:flex-row items-stretch min-h-[26px]">
            <span className="w-full sm:w-28 p-1 font-semibold border-b sm:border-b-0 sm:border-r border-slate-700 bg-brand-100/70 text-slate-800 flex items-center shrink-0 text-[9px] sm:text-[9.5px]">
              Altura Estimada:
            </span>
            <input 
              type="text" 
              name="workHeight" 
              value={data.workHeight} 
              onChange={handleChange} 
              className="flex-1 p-1 px-2 bg-transparent outline-none font-bold text-brand-900 text-[10px] sm:text-[10.5px]" 
              placeholder="Ej: 6.5 metros" 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
