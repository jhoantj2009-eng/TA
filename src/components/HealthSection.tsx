import React from 'react';
import { HelpCircle } from 'lucide-react';
import { PermitData, WorkerHealth } from '../types';

interface HealthSectionProps {
  data: PermitData;
  updateData: (data: Partial<PermitData>) => void;
}

const HEALTH_QUESTIONS = [
  { key: 'hallucinogens', code: 'P1', short: 'Alucinógenos/Licor', full: '¿Ha consumido sustancias alucinógenas o licor en las últimas 12 horas?' },
  { key: 'medication', code: 'P2', short: 'Medicamentos somnolencia', full: '¿Ha consumido medicamentos que generen somnolencia en las últimas 12 horas?' },
  { key: 'epilepsy', code: 'P3', short: 'Epilepsia / Vértigo', full: '¿Sufre de epilepsia, mareos o vértigo?' },
  { key: 'acrophobia', code: 'P4', short: 'Acrofobia (Alturas)', full: '¿Miedo a las alturas (Acrofobia)?' },
  { key: 'pregnancy', code: 'P5', short: 'Gestación', full: '¿Se encuentra en estado de gestación?' }
] as const;

export function HealthSection({ data, updateData }: HealthSectionProps) {
  const handleGlobalObservationsChange = (value: string) => {
    updateData({ health: { ...data.health, observations: value } });
  };

  const handleWorkerHealthChange = (workerId: string, field: keyof WorkerHealth, value: 'SI' | 'NO' | 'N/A') => {
    updateData({
      workers: data.workers.map(w => w.id === workerId ? { ...w, health: { ...w.health, [field]: value } } : w)
    });
  };

  const handleSetAllNegative = (workerId: string) => {
    updateData({
      workers: data.workers.map(w => {
        if (w.id === workerId) {
          return {
            ...w,
            health: {
              hallucinogens: 'NO',
              medication: 'NO',
              epilepsy: 'NO',
              acrophobia: 'NO',
              pregnancy: 'NO'
            }
          };
        }
        return w;
      })
    });
  };

  // Función para determinar si el trabajador está apto según las respuestas
  const getAptitudeStatus = (health?: WorkerHealth) => {
    if (!health) return { status: 'PENDIENTE', color: 'text-slate-700 bg-slate-100 border-slate-300' };
    const hasRisk = health.hallucinogens === 'SI' || health.medication === 'SI' || health.epilepsy === 'SI' || health.acrophobia === 'SI' || health.pregnancy === 'SI';
    if (hasRisk) {
      return { status: 'NO APTO', color: 'text-red-700 bg-red-100 border-red-400 font-black' };
    }
    const hasAnswered = health.hallucinogens && health.medication && health.epilepsy && health.acrophobia;
    if (hasAnswered) {
      return { status: 'APTO', color: 'text-emerald-800 bg-emerald-100 border-emerald-400 font-bold' };
    }
    return { status: 'PENDIENTE', color: 'text-slate-700 bg-slate-100 border-slate-300' };
  };

  // Aseguramos exactamente 6 filas para que coincida 1:1 con el registro de trabajadores
  const fixedRowCount = Math.max(6, data.workers.length);
  const rows = Array.from({ length: fixedRowCount }, (_, i) => data.workers[i] || null);

  return (
    <div className="border border-slate-700 mb-1.5 flex flex-col bg-white shadow-2xs">
      {/* Header de Sección estrictamente centrado */}
      <div className="bg-brand-700 text-white font-bold py-1 px-2 text-[10.5px] sm:text-xs uppercase tracking-wider text-center relative border-b border-slate-700 flex items-center justify-center">
        <span>III. APTITUD PSICOFÍSICA Y EVALUACIÓN DE SALUD PREVIA</span>
      </div>

      {/* Convenciones / Criterios de Valoración Médica */}
      <div className="bg-brand-50/50 border-b border-slate-700 p-1 px-2 text-[8.5px] sm:text-[9px] text-slate-800 leading-tight">
        <div className="font-bold text-slate-950 mb-0.5 uppercase tracking-wide flex items-center justify-center gap-1 text-center">
          <HelpCircle size={11} className="text-brand-700 print:hidden" />
          <span>Criterios de Valoración Médica Pre-operacional (Marcar S=Sí / N=No):</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-1 pt-0.5">
          {HEALTH_QUESTIONS.map(q => (
            <div key={q.code} className="flex gap-1 items-center justify-center bg-white p-0.5 px-1 rounded border border-brand-200">
              <span className="font-bold text-brand-950 bg-brand-100 px-1 rounded text-[8.5px] shrink-0 font-mono">{q.code}</span>
              <span className="text-[8px] sm:text-[8.5px] text-slate-800 truncate font-medium" title={q.full}>{q.short}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabla Matriz de Evaluación con Bordes 100% Completos y scroll horizontal en móviles */}
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse min-w-[560px] md:min-w-0" style={{ tableLayout: 'fixed', borderSpacing: 0 }}>
          <thead>
            <tr className="bg-brand-100/90 text-brand-950 text-center font-bold text-[9px] sm:text-[9.5px]">
              <th className="border border-slate-700 p-0.5 text-center align-middle font-bold" style={{ width: '4%' }} rowSpan={2}>
                No.
              </th>
              <th className="border border-slate-700 p-0.5 text-center align-middle font-bold" style={{ width: '36%' }} rowSpan={2}>
                Trabajador Autorizado
              </th>
              {HEALTH_QUESTIONS.map(q => (
                <th key={q.code} colSpan={2} className="border border-slate-700 p-0.5 font-bold text-brand-950 text-center align-middle" style={{ width: '8%' }} title={q.full}>
                  <div className="truncate leading-tight text-center">
                    <span className="text-[9px] font-bold">{q.code}</span>
                    <span className="font-normal text-[7.5px] text-slate-700 hidden sm:inline ml-0.5">({q.short})</span>
                  </div>
                </th>
              ))}
              <th className="border border-slate-700 p-0.5 text-center align-middle font-bold" style={{ width: '12%' }} rowSpan={2}>
                Concepto
              </th>
              <th className="border border-slate-700 p-0.5 text-center align-middle font-bold print:hidden" style={{ width: '8%' }} rowSpan={2}>
                Acción
              </th>
            </tr>
            <tr className="bg-brand-50 text-center font-bold text-[8px] sm:text-[8.5px] text-slate-900">
              {HEALTH_QUESTIONS.map(q => (
                <React.Fragment key={`sub-${q.code}`}>
                  <th className="border border-slate-700 p-0.5 font-bold text-red-950 bg-red-100/80 text-center align-middle" style={{ width: '4%' }}>S</th>
                  <th className="border border-slate-700 p-0.5 font-bold text-emerald-950 bg-emerald-100/80 text-center align-middle" style={{ width: '4%' }}>N</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody className="text-[9px] sm:text-[9.5px]">
            {rows.map((worker, index) => {
              if (!worker) {
                // Fila vacía para completar las 6 filas oficiales con bordes perfectos
                return (
                  <tr key={`empty-${index}`} className="h-[28px]">
                    <td className="border border-slate-700 p-0.5 text-center font-bold bg-slate-50 text-slate-400">{index + 1}</td>
                    <td className="border border-slate-700 p-0.5 pl-1.5 text-slate-300 italic font-light">&nbsp;</td>
                    {HEALTH_QUESTIONS.map(q => (
                      <React.Fragment key={`empty-${q.code}`}>
                        <td className="border border-slate-700 p-0.5 text-center bg-white">&nbsp;</td>
                        <td className="border border-slate-700 p-0.5 text-center bg-white">&nbsp;</td>
                      </React.Fragment>
                    ))}
                    <td className="border border-slate-700 p-0.5 text-center bg-white">&nbsp;</td>
                    <td className="border border-slate-700 p-0.5 text-center print:hidden bg-white">&nbsp;</td>
                  </tr>
                );
              }

              const aptitude = getAptitudeStatus(worker.health);
              return (
                <tr key={worker.id} className="h-[28px] hover:bg-slate-50/80 transition-colors">
                  <td className="border border-slate-700 p-0.5 text-center font-bold bg-slate-50 text-slate-900">
                    {index + 1}
                  </td>
                  <td className="border border-slate-700 p-0.5 pl-1.5 font-medium text-slate-900" style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    <div className="font-semibold truncate text-[9.5px] text-slate-900">
                      {worker.name || <span className="text-slate-400 italic font-normal">Sin nombre asignado</span>}
                    </div>
                    <div className="text-[8px] text-slate-600 tabular-nums truncate font-medium">
                      {worker.docType && worker.docNumber ? `${worker.docType}: ${worker.docNumber}` : 'Doc: ---'}
                    </div>
                  </td>
                  {HEALTH_QUESTIONS.map(q => {
                    const val = worker.health[q.key as keyof WorkerHealth];
                    return (
                      <React.Fragment key={q.code}>
                        {/* Casilla SI */}
                        <td 
                          className="border border-slate-700 p-0.5 text-center align-middle cursor-pointer hover:bg-red-50/60"
                          onClick={() => handleWorkerHealthChange(worker.id, q.key as keyof WorkerHealth, val === 'SI' ? 'NO' : 'SI')}
                          title={`${q.short}: Marcar SI`}
                        >
                          <div className={`w-4 h-4 mx-auto border border-slate-800 flex items-center justify-center text-center font-black text-[10px] leading-none select-none ${val === 'SI' ? 'bg-red-600 text-white' : 'bg-white text-transparent'}`}>
                            {val === 'SI' ? 'X' : ''}
                          </div>
                        </td>
                        {/* Casilla NO */}
                        <td 
                          className="border border-slate-700 p-0.5 text-center align-middle cursor-pointer hover:bg-emerald-50/60"
                          onClick={() => handleWorkerHealthChange(worker.id, q.key as keyof WorkerHealth, val === 'NO' ? 'SI' : 'NO')}
                          title={`${q.short}: Marcar NO`}
                        >
                          <div className={`w-4 h-4 mx-auto border border-slate-800 flex items-center justify-center text-center font-black text-[10px] leading-none select-none ${val === 'NO' ? 'bg-emerald-700 text-white' : 'bg-white text-transparent'}`}>
                            {val === 'NO' ? 'X' : ''}
                          </div>
                        </td>
                      </React.Fragment>
                    );
                  })}
                  <td className="border border-slate-700 p-0.5 text-center align-middle">
                    <span className={`inline-block px-1.5 py-0.5 text-[8.5px] font-bold border rounded ${aptitude.color}`}>
                      {aptitude.status}
                    </span>
                  </td>
                  <td className="border border-slate-700 p-0.5 text-center align-middle print:hidden">
                    <button
                      type="button"
                      onClick={() => handleSetAllNegative(worker.id)}
                      className="text-[8px] text-brand-700 hover:text-brand-900 bg-brand-50 hover:bg-brand-100 border border-brand-300 rounded px-1 py-0.5 font-semibold transition-colors"
                      title="Marcar todas las respuestas en NO (Apto)"
                    >
                      Apto
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Observaciones Generales de Salud y Restricciones Médicas */}
      <div className="border-t border-slate-700 bg-white flex flex-col">
        <div className="py-0.5 px-2 font-bold text-[9px] sm:text-[9.5px] border-b border-slate-700 bg-brand-100/90 text-brand-950 uppercase flex items-center justify-between">
          <span>OBSERVACIONES GENERALES DE SALUD Y RESTRICCIONES MÉDICAS:</span>
          <span className="font-normal text-[8px] text-slate-600 italic">
            (en caso de no apto, suspenda el permiso para dicho trabajador)
          </span>
        </div>
        <textarea 
          className="w-full min-h-[38px] p-1.5 px-2 text-[9px] sm:text-[9.5px] outline-none resize-none bg-transparent placeholder-slate-400 text-slate-900 font-medium"
          value={data.health.observations}
          onChange={(e) => handleGlobalObservationsChange(e.target.value)}
          placeholder="Escriba aquí observaciones de salud o restricciones..."
          rows={2}
        />
      </div>
    </div>
  );
}
