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
    <div className="mb-2 bg-white shadow-2xs avoid-break">
      {/* Header institucional estrictamente centrado y legible */}
      <div className="bg-brand-700 text-white font-bold py-1.5 px-2 text-[11px] uppercase tracking-wider text-center border border-black flex items-center justify-center leading-snug">
        <span>I. INFORMACIÓN GENERAL DEL PERMISO</span>
      </div>

      {/* Tabla estructurada de información general */}
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse border-l border-r border-b border-black text-[10px] sm:text-[10.5px] min-w-[560px] md:min-w-0" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '13%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '12%' }} />
          </colgroup>
          <tbody>
            {/* Fila 1: Consecutivo y Lugar / Área */}
            <tr className="bg-brand-50/40">
              <td className="border-b border-l border-r border-black px-1.5 py-1.5 font-bold bg-brand-200/80 text-brand-950 text-center align-middle leading-snug">
                Permiso N°:
              </td>
              <td className="border-b border-r border-black px-1.5 py-1 text-center align-middle bg-white">
                <input
                  type="text"
                  name="permitNumber"
                  value={data.permitNumber ?? ''}
                  onChange={handleChange}
                  className="w-full py-0.5 bg-transparent outline-none font-black text-brand-950 text-center text-[11px] font-mono leading-snug"
                  placeholder="001"
                  title="Número consecutivo de permiso para trazabilidad de auditoría"
                />
              </td>
              <td className="border-b border-r border-black px-1.5 py-1.5 font-semibold bg-brand-100/70 text-slate-900 text-center align-middle leading-snug">
                Lugar / Área:
              </td>
              <td colSpan={5} className="border-b border-r border-black px-2 py-1 text-center align-middle bg-white">
                <input
                  type="text"
                  name="location"
                  value={data.location ?? ''}
                  onChange={handleChange}
                  className="w-full py-0.5 bg-transparent outline-none font-semibold text-slate-950 text-center text-[10.5px] leading-snug"
                  placeholder="Ej: Techo Bodega / Nave 2"
                />
              </td>
            </tr>

            {/* Fila 2: Fecha y Horas */}
            <tr className="bg-brand-50/20">
              <td className="border-b border-l border-r border-black px-1.5 py-1.5 font-semibold bg-brand-100/70 text-slate-900 text-center align-middle leading-snug">
                Fecha Expedición:
              </td>
              <td className="border-b border-r border-black px-1 py-1 text-center align-middle bg-white">
                <DateSelector
                  value={data.date}
                  onChange={(val) => updateData({ date: val })}
                  ariaLabel="Fecha de Expedición"
                  className="w-full py-0.5 px-1 font-bold text-slate-950 text-[10px] leading-snug"
                />
              </td>
              <td className="border-b border-r border-black px-1.5 py-1.5 font-semibold bg-brand-100/70 text-slate-900 text-center align-middle leading-snug">
                Hora Inicio:
              </td>
              <td className="border-b border-r border-black px-1 py-1 text-center align-middle bg-white">
                <TimeSelector
                  value={data.startTime}
                  onChange={(val) => updateData({ startTime: val })}
                  ariaLabel="Hora de Inicio"
                  className="w-full py-0.5 px-1 font-bold text-slate-950 text-[10px] leading-snug"
                />
              </td>
              <td className="border-b border-r border-black px-1.5 py-1.5 font-semibold bg-brand-100/70 text-slate-900 text-center align-middle leading-snug">
                Válido Hasta:
              </td>
              <td className="border-b border-r border-black px-1 py-1 text-center align-middle bg-white">
                <DateSelector
                  value={data.validUntil}
                  onChange={(val) => updateData({ validUntil: val })}
                  ariaLabel="Válido Hasta"
                  className="w-full py-0.5 px-1 font-bold text-slate-950 text-[10px] leading-snug"
                />
              </td>
              <td className="border-b border-r border-black px-1.5 py-1.5 font-semibold bg-brand-100/70 text-slate-900 text-center align-middle leading-snug">
                Hora Término:
              </td>
              <td className="border-b border-r border-black px-1 py-1 text-center align-middle bg-white">
                <TimeSelector
                  value={data.endTime}
                  onChange={(val) => updateData({ endTime: val })}
                  ariaLabel="Hora de Término"
                  className="w-full py-0.5 px-1 font-bold text-slate-950 text-[10px] leading-snug"
                />
              </td>
            </tr>

            {/* Fila 3: Tipo de Trabajo y Altura Estimada */}
            <tr>
              <td className="border-b border-l border-r border-black px-1.5 py-1.5 font-semibold bg-brand-100/70 text-slate-900 text-center align-middle leading-snug">
                Tipo de Trabajo:
              </td>
              <td colSpan={4} className="border-b border-r border-black px-2 py-1 text-center align-middle bg-white">
                <input
                  type="text"
                  name="workType"
                  value={data.workType}
                  onChange={handleChange}
                  className="w-full py-0.5 bg-transparent outline-none font-semibold text-slate-950 text-center text-[10.5px] leading-snug"
                  placeholder="Ej: Mantenimiento de cubierta / Instalación eléctrica en postes"
                />
              </td>
              <td className="border-b border-r border-black px-1.5 py-1.5 font-semibold bg-brand-100/70 text-slate-900 text-center align-middle leading-snug">
                Altura Estimada:
              </td>
              <td colSpan={2} className="border-b border-r border-black px-2 py-1 text-center align-middle bg-white">
                <input
                  type="text"
                  name="workHeight"
                  value={data.workHeight}
                  onChange={handleChange}
                  className="w-full py-0.5 bg-transparent outline-none font-bold text-brand-950 text-center text-[10.5px] leading-snug"
                  placeholder="Ej: 6.5 metros"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
