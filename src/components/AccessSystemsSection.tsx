import React from 'react';
import { Check, Plus, X } from 'lucide-react';
import { PermitData } from '../types';

interface AccessSystemsProps {
  data: PermitData;
  updateData: (data: Partial<PermitData>) => void;
}

interface ItemDef {
  key: string | number;
  label: string;
  showNA?: boolean;
}

type SelectableSystemKey =
  | 'stairs'
  | 'scaffolding'
  | 'suspendedScaffold'
  | 'pretales'
  | 'ropes'
  | 'platform';

interface SystemConfig {
  key: SelectableSystemKey;
  buttonLabel: string;
  blockTitle: string;
  items: ItemDef[];
}

export function AccessSystemsSection({ data, updateData }: AccessSystemsProps) {
  const updateSystem = (system: SelectableSystemKey, field: string, value: any) => {
    const existing = data.accessSystems?.[system] || { used: '', checklist: {}, isApt: '' };
    updateData({
      accessSystems: {
        ...data.accessSystems,
        [system]: {
          ...existing,
          [field]: value
        }
      }
    });
  };

  const getSystemItems = (system: SelectableSystemKey): ItemDef[] => {
    switch (system) {
      case 'stairs':
        return ladderItems;
      case 'scaffolding':
        return scaffoldItems;
      case 'suspendedScaffold':
        return suspendedScaffoldItems;
      case 'pretales':
        return pretalItems;
      case 'ropes':
        return ropeItems;
      case 'platform':
        return platformItems;
    }
  };

  const updateChecklist = (system: SelectableSystemKey, itemKey: string | number, value: 'SI' | 'NO' | 'N.A') => {
    const keyStr = itemKey.toString();
    const existing = data.accessSystems?.[system] || { used: '', checklist: {}, isApt: '' };
    const current = (existing as any)?.checklist || {};
    const prevValue = current[keyStr];
    const nextChecklist = {
      ...current,
      [keyStr]: value
    };
    const itemsList = getSystemItems(system);
    const hasFailure = itemsList.some((item) => nextChecklist[item.key.toString()] === 'NO');
    const allYes = itemsList.length > 0 && itemsList.every((item) => nextChecklist[item.key.toString()] === 'SI');

    let nextIsApt = existing.isApt;
    if (hasFailure) {
      nextIsApt = 'No';
    } else if (allYes) {
      nextIsApt = 'Si';
    } else if ((prevValue === 'NO' && existing.isApt === 'No') || (prevValue === 'SI' && existing.isApt === 'Si')) {
      nextIsApt = '';
    }

    updateData({
      accessSystems: {
        ...data.accessSystems,
        [system]: {
          ...existing,
          checklist: nextChecklist,
          isApt: nextIsApt
        }
      }
    });
  };

  const markAllYes = (system: SelectableSystemKey) => {
    const existing = data.accessSystems?.[system] || { used: '', checklist: {}, isApt: '' };
    const nextChecklist: Record<string, 'SI' | 'NO' | 'N.A'> = {
      ...((existing as any)?.checklist || {})
    };
    getSystemItems(system).forEach((item) => {
      nextChecklist[item.key.toString()] = 'SI';
    });

    updateData({
      accessSystems: {
        ...data.accessSystems,
        [system]: {
          ...existing,
          checklist: nextChecklist,
          isApt: 'Si'
        }
      }
    });
  };

  // Definición de ítems técnicos reglamentarios
  const ladderItems: ItemDef[] = [
    { key: 1, label: 'Apoyo sobre superficie firme, estable y nivelada' },
    { key: 2, label: 'Zapatas antideslizantes completas y en buen estado' },
    { key: 3, label: 'Peldaños y largueros libres de grasa, fisuras o deformaciones' },
    { key: 4, label: 'Inclinación reglamentaria (relación 1:4 / 75° de ángulo)' },
    { key: 5, label: 'Sobresale mínimo 1 metro sobre el punto de apoyo/desembarque' },
    { key: 6, label: 'Asegurada o atada en la parte superior e inferior' },
  ];

  const scaffoldItems: ItemDef[] = [
    { key: 1, label: 'Bases y tornillos niveladores sobre durmientes firmes' },
    { key: 2, label: 'Verticales aplomados, horizontales y diagonales completas' },
    { key: 3, label: 'Plataforma metálica completa, antideslizante y sin huecos' },
    { key: 4, label: 'Barandas de seguridad completas (sup. 1.20m, inter. y rodapié)' },
    { key: 5, label: 'Acceso seguro mediante escaleras internas con trampilla' },
    { key: 6, label: 'Arriostramiento / anclaje a estructura sólida conforme a norma' },
    { key: 7, label: 'Tarjeta de inspección vigente (Verde = Operativo)' },
  ];

  const suspendedScaffoldItems: ItemDef[] = [
    { key: 1, label: 'Estructura de soporte (vigas/contrapesos) calculada, asegurada y certificada' },
    { key: 2, label: 'Cables de suspensión sin cortes, aplastamientos ni corrosión' },
    { key: 3, label: 'Línea de vida vertical independiente por trabajador, anclada fuera del andamio' },
    { key: 4, label: 'Plataforma completa, antideslizante, con barandas (1.20 m, intermedia y rodapié)' },
    { key: 5, label: 'Winches / izaje con freno y dispositivo anticaída operativos' },
    { key: 6, label: 'Plataforma nivelada y estabilizada contra balanceo y separación de fachada' },
    { key: 7, label: 'Capacidad máxima de carga señalizada y no excedida' },
    { key: 8, label: 'Área inferior demarcada, señalizada y libre de personas' },
  ];

  const pretalItems: ItemDef[] = [
    { key: 1, label: 'Cintas y bandas sintéticas sin deshilachados, cortes ni desgaste' },
    { key: 2, label: 'Costuras de seguridad intactas, sin hilos rotos' },
    { key: 3, label: 'Hebillas, anillos en D y herrajes sin corrosión ni fisuras' },
    { key: 4, label: 'Ajuste adecuado al poste / estructura de ascenso' },
  ];

  const ropeItems: ItemDef[] = [
    { key: 1, label: 'Descendedor autofrenante certificado (EN 12841 / 341)' },
    { key: 2, label: 'Anticaídas para cuerda (freno) con bloqueo automático' },
    { key: 3, label: 'Silla ergonómica para trabajo en suspensión certificada' },
    { key: 4, label: 'Cuerdas semiestáticas certificadas con protectores de borde' },
  ];

  const platformItems: ItemDef[] = [
    { key: 1, label: 'Mandos y botón de parada de emergencia 100% operativos' },
    { key: 2, label: 'Sin fugas de aceite o hidráulicas, neumáticos nivelados' },
    { key: 3, label: 'Estabilizadores totalmente desplegados sobre terreno firme' },
    { key: 4, label: 'Puerta de canastilla y puntos de anclaje certificados' },
  ];

  const systemsConfig: SystemConfig[] = [
    {
      key: 'stairs',
      buttonLabel: 'Escaleras',
      blockTitle: 'Escaleras (Portátiles / Fijas)',
      items: ladderItems,
    },
    {
      key: 'scaffolding',
      buttonLabel: 'Andamio Multidireccional',
      blockTitle: 'Andamio Multidireccional Certificado',
      items: scaffoldItems,
    },
    {
      key: 'suspendedScaffold',
      buttonLabel: 'Andamio Colgante',
      blockTitle: 'Andamio Colgante (Suspendido)',
      items: suspendedScaffoldItems,
    },
    {
      key: 'pretales',
      buttonLabel: 'Postes',
      blockTitle: 'Postes / Ascenso a Postes',
      items: pretalItems,
    },
    {
      key: 'ropes',
      buttonLabel: 'Sistema por Cuerdas',
      blockTitle: 'Sistema de Acceso por Cuerdas',
      items: ropeItems,
    },
    {
      key: 'platform',
      buttonLabel: 'Plataforma PEMP',
      blockTitle: 'Plataforma PEMP / Elevadora',
      items: platformItems,
    },
  ];

  const visibleSystems = systemsConfig.filter(
    (sys) => data.accessSystems?.[sys.key]?.used === 'SI'
  );

  const renderChecklistRow = (
    system: SelectableSystemKey,
    item: ItemDef
  ) => {
    const keyStr = item.key.toString();
    const val = (data.accessSystems?.[system] as any)?.checklist?.[keyStr] || '';
    
    return (
      <div
        key={keyStr}
        className={`flex border-b border-black text-[9px] min-h-[21px] items-stretch ${val === 'SI' ? 'bg-emerald-50/70' : val === 'NO' ? 'bg-red-50/70' : val === 'N.A' ? 'bg-slate-100/70' : 'bg-white hover:bg-slate-50'}`}
      >
        <div
          className="flex-1 px-1.5 py-[3px] border-r border-black flex items-center cursor-pointer select-none text-left min-w-0"
          onClick={() => updateChecklist(system, keyStr, val === 'SI' ? 'NO' : val === 'NO' ? 'N.A' : 'SI')}
        >
          <span className={`leading-snug break-words ${val === 'SI' ? 'font-bold text-emerald-950' : val === 'NO' ? 'font-bold text-red-950' : val === 'N.A' ? 'text-slate-600 font-medium' : 'text-black font-medium'}`} title={item.label}>
            {item.label}
          </span>
        </div>
        <div className="w-[72px] flex divide-x divide-black shrink-0 bg-white">
          <div
            className={`w-[24px] flex items-center justify-center cursor-pointer select-none ${val === 'SI' ? 'bg-emerald-100' : 'hover:bg-emerald-50'}`}
            onClick={() => updateChecklist(system, keyStr, 'SI')}
            title="Marcar SI"
          >
            <div className={`w-3.5 h-3.5 border border-black flex items-center justify-center ${val === 'SI' ? 'bg-emerald-700 text-white' : 'bg-white'}`}>
              {val === 'SI' && (
                <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 block" aria-hidden="true">
                  <path d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              )}
            </div>
          </div>
          <div
            className={`w-[24px] flex items-center justify-center cursor-pointer select-none ${val === 'NO' ? 'bg-red-100' : 'hover:bg-red-50'}`}
            onClick={() => updateChecklist(system, keyStr, 'NO')}
            title="Marcar NO"
          >
            <div className={`w-3.5 h-3.5 border border-black flex items-center justify-center ${val === 'NO' ? 'bg-red-600 text-white' : 'bg-white'}`}>
              {val === 'NO' && (
                <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 block" aria-hidden="true">
                  <path d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              )}
            </div>
          </div>
          <div
            className={`w-[24px] flex items-center justify-center cursor-pointer select-none ${val === 'N.A' ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
            onClick={() => updateChecklist(system, keyStr, 'N.A')}
            title="Marcar N.A"
          >
            <div className={`w-3.5 h-3.5 border border-black flex items-center justify-center ${val === 'N.A' ? 'bg-slate-700 text-white' : 'bg-white'}`}>
              {val === 'N.A' && (
                <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 block" aria-hidden="true">
                  <path d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSystemBlock = (
    title: string,
    system: SelectableSystemKey,
    items: ItemDef[],
    extraApt = true
  ) => {
    const sysData = data.accessSystems?.[system] as any;
    const hasFailure = items.some((item) => sysData?.checklist?.[item.key.toString()] === 'NO');
    const allYes = items.length > 0 && items.every((item) => sysData?.checklist?.[item.key.toString()] === 'SI');
    const isApt = hasFailure ? 'No' : allYes && !sysData?.isApt ? 'Si' : sysData?.isApt;

    return (
      <div key={system} className="border border-black flex flex-col bg-white shadow-2xs rounded-xs overflow-hidden avoid-break">
        {/* Cabecera del Submódulo */}
        <div className="bg-brand-100/90 text-black font-bold px-2 py-1 min-h-[24px] text-[9.5px] border-b border-black flex justify-between items-center gap-1">
          <span className="uppercase tracking-tight flex-1 text-left font-black leading-snug">{title}</span>
          <div className="print:hidden flex items-center gap-1 shrink-0 ml-1">
            <button
              type="button"
              onClick={() => markAllYes(system)}
              className={`print:hidden px-1.5 py-0.5 rounded-xs text-[7.5px] font-semibold border flex items-center gap-0.5 transition-colors cursor-pointer ${
                allYes
                  ? 'bg-emerald-700 text-white border-emerald-800'
                  : 'bg-white/80 hover:bg-emerald-50 text-emerald-800 border-emerald-300 hover:border-emerald-400'
              }`}
              title="Marcar todos los criterios como SÍ"
            >
              <Check size={10} />
              <span>Todo SÍ</span>
            </button>
            <button
              type="button"
              onClick={() => updateSystem(system, 'used', '')}
              className="print:hidden px-1.5 py-0.5 rounded-xs text-[7.5px] font-semibold bg-white/80 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-300 hover:border-red-300 flex items-center gap-0.5 transition-colors cursor-pointer"
              title="Quitar sistema de acceso"
            >
              <X size={10} />
              <span>Quitar</span>
            </button>
          </div>
        </div>

        {/* Cabecera de Checklist */}
        <div className="bg-slate-100 text-black text-[8.5px] font-bold flex border-b border-black min-h-[22px] items-stretch">
          <div className="flex-1 px-1.5 py-0.5 border-r border-black flex items-center text-left font-bold leading-snug">
            Criterio de Inspección Preoperacional
          </div>
          <div className="w-[72px] flex divide-x divide-black text-center shrink-0">
            <div className="w-[24px] flex items-center justify-center text-emerald-950 font-black">SI</div>
            <div className="w-[24px] flex items-center justify-center text-red-950 font-black">NO</div>
            <div className="w-[24px] flex items-center justify-center text-slate-800 font-black">N.A</div>
          </div>
        </div>

        {/* Filas de Checklist */}
        <div className="flex flex-col">
          {items.map(item => renderChecklistRow(system, item))}
        </div>

        {/* Dictamen Destacado al pie: ¿SISTEMA APTO Y SEGURO PARA OPERAR? */}
        {extraApt && (
          <>
            <div className={`flex ${items.length === 0 ? 'border-t border-black' : ''} text-[8.5px] min-h-[23px] items-stretch ${hasFailure ? 'bg-red-50' : 'bg-brand-50'}`}>
              <div className={`flex-1 px-2 py-0.5 border-r border-black font-black uppercase flex items-center justify-between leading-snug ${hasFailure ? 'text-red-950' : 'text-black'}`}>
                <span>¿SISTEMA APTO Y SEGURO PARA OPERAR?</span>
              </div>
              <div className="w-[72px] flex divide-x divide-black shrink-0 bg-white">
                <div
                  className={`w-[36px] flex items-center justify-center gap-0.5 font-black ${
                    hasFailure
                      ? 'opacity-45 print:opacity-100 cursor-not-allowed text-slate-400 print:text-slate-900'
                      : isApt === 'Si'
                        ? 'bg-emerald-100 text-emerald-950 cursor-pointer'
                        : 'hover:bg-emerald-50 cursor-pointer'
                  }`}
                  onClick={() => {
                    if (hasFailure) return;
                    updateSystem(system, 'isApt', isApt === 'Si' ? '' : 'Si');
                  }}
                  title={hasFailure ? 'No puede ser apto mientras exista una condición en NO' : 'Marcar sistema como apto'}
                >
                  <span className="text-[7.5px] leading-normal">SÍ</span>
                  <div className={`w-3 h-3 border border-black flex items-center justify-center ${isApt === 'Si' ? 'bg-emerald-700 text-white' : 'bg-white'}`}>
                    {isApt === 'Si' && (
                      <svg viewBox="0 0 12 12" className="w-2 h-2 block" aria-hidden="true">
                        <path d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                      </svg>
                    )}
                  </div>
                </div>
                <div
                  className={`w-[36px] flex items-center justify-center gap-0.5 font-black ${
                    hasFailure
                      ? 'bg-red-100 text-red-950 cursor-default'
                      : isApt === 'No'
                        ? 'bg-red-100 text-red-950 cursor-pointer'
                        : 'hover:bg-red-50 cursor-pointer'
                  }`}
                  onClick={() => {
                    if (hasFailure) return;
                    updateSystem(system, 'isApt', isApt === 'No' ? '' : 'No');
                  }}
                  title={hasFailure ? 'Marcado automáticamente en NO por criterio incumplido' : 'Marcar sistema como no apto'}
                >
                  <span className="text-[7.5px] leading-normal">NO</span>
                  <div className={`w-3 h-3 border border-black flex items-center justify-center ${isApt === 'No' ? 'bg-red-600 text-white' : 'bg-white'}`}>
                    {isApt === 'No' && (
                      <svg viewBox="0 0 12 12" className="w-2 h-2 block" aria-hidden="true">
                        <path d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {hasFailure && (
              <div className="print:hidden border-t border-red-200 bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700 text-left">
                No apto automático: al menos una condición de inspección no cumple (NO).
              </div>
            )}
            {!hasFailure && allYes && isApt === 'Si' && (
              <div className="print:hidden border-t border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-800 text-left">
                Apto automático: todas las condiciones de inspección cumplen (SÍ).
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="border border-black mb-1.5 bg-white shadow-2xs avoid-break">
      {/* Header Sección con azul petróleo corporativo */}
      <div className="bg-brand-700 text-white font-bold py-1.5 px-2 text-[11px] uppercase tracking-wider text-center relative border-b border-black flex items-center justify-center leading-snug">
        <span>V. SISTEMAS DE ACCESO Y EQUIPOS DE TRABAJO</span>
      </div>

      {/* Selector de sistemas (solo pantalla) */}
      <div className="print:hidden p-2.5 bg-slate-50 border-b border-slate-200">
        <p className="text-xs font-semibold text-slate-800 mb-2">
          ¿Qué sistema(s) de acceso se usará(n) en esta tarea?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {systemsConfig.map((sys) => {
            const isSelected = data.accessSystems?.[sys.key]?.used === 'SI';
            return (
              <button
                key={sys.key}
                type="button"
                onClick={() => updateSystem(sys.key, 'used', isSelected ? '' : 'SI')}
                className={`print:hidden min-h-[42px] px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-brand-700 text-white border-brand-800 hover:bg-brand-800 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-brand-400'
                }`}
              >
                {isSelected ? (
                  <Check size={15} className="shrink-0" />
                ) : (
                  <Plus size={15} className="shrink-0 text-slate-500" />
                )}
                <span>{sys.buttonLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bloques de sistemas seleccionados */}
      {visibleSystems.length === 0 ? (
        <div className="p-3 text-center text-[10px] text-slate-600 italic bg-white">
          N.A. — No se seleccionaron sistemas de acceso.
        </div>
      ) : (
        <div
          className={`p-1.5 grid gap-2 text-[8.5px] items-start ${
            visibleSystems.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'
          }`}
        >
          {visibleSystems.map((sys, idx) =>
            renderSystemBlock(`${idx + 1}. ${sys.blockTitle}`, sys.key, sys.items, true)
          )}
        </div>
      )}

      {/* Campo inferior ancho para Observaciones Técnicas */}
      <div className="border-t border-black bg-brand-50/40 flex flex-col avoid-break">
        <div className="bg-brand-100/90 font-bold px-2 py-1 text-[9px] border-b border-black uppercase text-black text-left tracking-tight leading-snug">
          Observaciones Técnicas de Sistemas de Acceso y Medidas Complementarias:
        </div>
        <textarea
          className="w-full min-h-[30px] p-1.5 px-2 text-[9.5px] leading-snug outline-none resize-none bg-transparent placeholder-slate-400 text-black text-center font-medium"
          value={data.observations}
          onChange={e => updateData({ observations: e.target.value })}
          placeholder="Anote aquí cualquier hallazgo, limitación de carga, desniveles del terreno o consideraciones del fabricante..."
          rows={1}
        />
      </div>
    </div>
  );
}
