import React from 'react';
import { HelpCircle } from 'lucide-react';
import { PermitData, WorkerHealth } from '../types';

interface HealthSectionProps {
  data: PermitData;
  updateData: (data: Partial<PermitData>) => void;
}

const HEALTH_QUESTIONS = [
  { key: 'hallucinogens', code: 'P1', short: 'Alucinógenos / Licor', full: '¿Ha consumido sustancias alucinógenas o licor en las últimas 12 horas?' },
  { key: 'medication', code: 'P2', short: 'Med. somnolencia', full: '¿Ha consumido medicamentos que generen somnolencia en las últimas 12 horas?' },
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

  const getAptitudeStatus = (health?: WorkerHealth) => {
    if (!health) return { status: 'PENDIENTE', color: 'text-slate-700 bg-slate-100 border-slate-400' };
    const hasRisk = health.hallucinogens === 'SI' || health.medication === 'SI' || health.epilepsy === 'SI' || health.acrophobia === 'SI' || health.pregnancy === 'SI';
    if (hasRisk) {
      return { status: 'NO APTO', color: 'text-red-800 bg-red-100 border-red-500 font-black' };
    }
    const hasAnswered = health.hallucinogens && health.medication && health.epilepsy && health.acrophobia;
    if (hasAnswered) {
      return { status: 'APTO', color: 'text-emerald-900 bg-emerald-100 border-emerald-500 font-bold' };
    }
    return { status: 'PENDIENTE', color: 'text-slate-700 bg-slate-100 border-slate-400' };
  };

  // Exactamente 6 filas para coincidir 1:1 con el registro de trabajadores
  const fixedRowCount = Math.max(6, data.workers.length);
  const rows = Array.from({ length: fixedRowCount }, (_, i) => data.workers[i] || null);

  return (
    <div className="mb-2 flex flex-col bg-white shadow-2xs avoid-break">
      {/* Header de Sección estrictamente centrado */}
      <div className="bg-brand-700 text-white font-bold py-1.5 px-2 text-[11px] uppercase tracking-wider text-center border border-black flex items-center justify-center leading-snug">
        <span>III. APTITUD PSICOFÍSICA Y EVALUACIÓN DE SALUD PREVIA</span>
      </div>

      {/* Convenciones / Criterios de Valoración Médica sin recortes */}
      <div className="bg-brand-50/50 border-l border-r border-b border-black px-2 py-1.5 text-[9px] text-slate-900 leading-snug">
        <div className="font-bold text-black mb-1 uppercase tracking-wide flex items-center justify-center gap-1 text-center">
          <HelpCircle size={11} className="text-brand-700 print:hidden" />
          <span>Criterios de Valoración Médica Pre-operacional (Marcar S=Sí / N=No):</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-1">
          {HEALTH_QUESTIONS.map(q => (
            <div key={q.code} className="flex gap-1 items-center justify-center bg-white py-1 px-1.5 rounded border border-slate-500 print:border-black">
              <span className="font-black text-brand-950 text-[8.5px] shrink-0 leading-normal">{q.code}:</span>
              <span className="text-[8.5px] text-black font-medium leading-normal text-center">{q.short}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabla Matriz de Evaluación con anchos porcentuales fijos (suman 100% en impresión) */}
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse border-l border-r border-black min-w-[560px] md:min-w-0" style={{ tableLayout: 'fixed', borderSpacing: 0 }}>
          <thead>
            <tr className="bg-brand-100/90 text-black text-center font-bold text-[10px]">
              <th className="border-b border-l border-r border-black p-1 text-center align-middle font-bold" style={{ width: '5%' }} rowSpan={2}>
                No.
              </th>
              <th className="border-b border-r border-black p-1 text-center align-middle font-bold" style={{ width: '31%' }} rowSpan={2}>
                Trabajador Autorizado
              </th>
              {HEALTH_QUESTIONS.map(q => (
                <th key={q.code} colSpan={2} className="border-b border-r border-black py-1 px-0.5 font-bold text-black text-center align-middle leading-snug" style={{ width: '10%' }} title={q.full}>
                  <span className="text-[10px] font-black">{q.code}</span>
                </th>
              ))}
              <th className="border-b border-r border-black p-1 text-center align-middle font-bold" style={{ width: '14%' }} rowSpan={2}>
                Concepto
              </th>
              <th className="border-b border-r border-black p-1 text-center align-middle font-bold print:hidden" style={{ width: '8%' }} rowSpan={2}>
                Acción
              </th>
            </tr>
            <tr className="bg-brand-50 text-center font-bold text-[9px] text-black">
              {HEALTH_QUESTIONS.map(q => (
                <React.Fragment key={`sub-${q.code}`}>
                  <th className="border-b border-r border-black py-0.5 font-bold text-red-950 bg-red-100/80 text-center align-middle" style={{ width: '5%' }}>S</th>
                  <th className="border-b border-r border-black py-0.5 font-bold text-emerald-950 bg-emerald-100/80 text-center align-middle" style={{ width: '5%' }}>N</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody className="text-[10px]">
            {rows.map((worker, index) => {
              if (!worker) {
                return (
                  <tr key={`empty-${index}`} className="min-h-[30px]" style={{ height: '30px' }}>
                    <td className="border-b border-l border-r border-black p-1 text-center font-bold bg-slate-50 text-slate-400 align-middle">{index + 1}</td>
                    <td className="border-b border-r border-black px-1.5 py-1 text-slate-300">&nbsp;</td>
                    {HEALTH_QUESTIONS.map(q => (
                      <React.Fragment key={`empty-${q.code}`}>
                        <td className="border-b border-r border-black p-1 text-center bg-white">&nbsp;</td>
                        <td className="border-b border-r border-black p-1 text-center bg-white">&nbsp;</td>
                      </React.Fragment>
                    ))}
                    <td className="border-b border-r border-black p-1 text-center bg-white">&nbsp;</td>
                    <td className="border-b border-r border-black p-1 text-center print:hidden bg-white">&nbsp;</td>
                  </tr>
                );
              }

              const aptitude = getAptitudeStatus(worker.health);
              return (
                <tr key={worker.id} className="min-h-[32px] hover:bg-slate-50/80 transition-colors">
                  <td className="border-b border-l border-r border-black p-1 text-center font-bold bg-slate-50 text-black align-middle">
                    {index + 1}
                  </td>
                  <td className="border-b border-r border-black px-2 py-1 font-medium text-black text-center align-middle">
                    <div className="font-semibold text-[10px] text-black text-center leading-snug break-words">
                      {worker.name || <span className="text-slate-400 italic font-normal">Sin nombre asignado</span>}
                    </div>
                    <div className="text-[8.5px] text-slate-700 text-center tabular-nums font-medium leading-snug">
                      {worker.docType && worker.docNumber ? `${worker.docType}: ${worker.docNumber}` : 'Doc: ---'}
                    </div>
                  </td>
                  {HEALTH_QUESTIONS.map(q => {
                    const val = worker.health[q.key as keyof WorkerHealth];
                    return (
                      <React.Fragment key={q.code}>
                        {/* Casilla SI */}
                        <td
                          className="border-b border-r border-black p-0.5 text-center align-middle cursor-pointer hover:bg-red-50/60"
                          onClick={() => handleWorkerHealthChange(worker.id, q.key as keyof WorkerHealth, val === 'SI' ? 'NO' : 'SI')}
                          title={`${q.short}: Marcar SI`}
                        >
                          <div className={`w-4 h-4 mx-auto border border-black flex items-center justify-center select-none ${val === 'SI' ? 'bg-red-600 text-white' : 'bg-white'}`}>
                            {val === 'SI' && (
                              <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 block" aria-hidden="true">
                                <path d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                              </svg>
                            )}
                          </div>
                        </td>
                        {/* Casilla NO */}
                        <td
                          className="border-b border-r border-black p-0.5 text-center align-middle cursor-pointer hover:bg-emerald-50/60"
                          onClick={() => handleWorkerHealthChange(worker.id, q.key as keyof WorkerHealth, val === 'NO' ? 'SI' : 'NO')}
                          title={`${q.short}: Marcar NO`}
                        >
                          <div className={`w-4 h-4 mx-auto border border-black flex items-center justify-center select-none ${val === 'NO' ? 'bg-emerald-700 text-white' : 'bg-white'}`}>
                            {val === 'NO' && (
                              <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 block" aria-hidden="true">
                                <path d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                              </svg>
                            )}
                          </div>
                        </td>
                      </React.Fragment>
                    );
                  })}
                  <td className="border-b border-r border-black p-1 text-center align-middle">
                    <div className={`mx-auto w-fit px-2 py-1 text-[8.5px] font-bold border rounded flex items-center justify-center leading-normal ${aptitude.color}`}>
                      {aptitude.status}
                    </div>
                  </td>
                  <td className="border-b border-r border-black p-1 text-center align-middle print:hidden">
                    <button
                      type="button"
                      onClick={() => handleSetAllNegative(worker.id)}
                      className="text-[8.5px] text-brand-700 hover:text-brand-900 bg-brand-50 hover:bg-brand-100 border border-brand-300 rounded px-1.5 py-0.5 font-semibold transition-colors"
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
      <div className="bg-white flex flex-col border border-black avoid-break">
        <div className="py-1 px-2 font-bold text-[9.5px] border-b border-black bg-brand-100/90 text-black uppercase flex items-center justify-between leading-snug">
          <span>OBSERVACIONES GENERALES DE SALUD Y RESTRICCIONES MÉDICAS:</span>
        </div>
        <textarea
          className="w-full min-h-[40px] p-1.5 px-2 text-[10px] text-center leading-snug outline-none resize-none bg-transparent placeholder-slate-400 text-black font-medium"
          value={data.health.observations}
          onChange={(e) => handleGlobalObservationsChange(e.target.value)}
          placeholder="Escriba aquí observaciones de salud o restricciones..."
          rows={2}
        />
      </div>
    </div>
  );
}
