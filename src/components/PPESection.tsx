import React, { useState, useRef, useLayoutEffect } from 'react';
import {
  Plus,
  Trash2,
  Check,
  Minus,
  Shield,
  HardHat,
  AlertTriangle,
  Wrench,
  CheckCheck,
  RotateCcw,
} from 'lucide-react';
import { PermitData } from '../types';

interface PPESectionProps {
  data: PermitData;
  updateData: (data: Partial<PermitData>) => void;
}

type PPECategory = 'fallProtection' | 'personal' | 'collective';
type FilterTab = 'all' | PPECategory | 'tools';

const DEFAULT_FALL_PROTECTION = [
  'Línea de vida Vertical portátil o fija',
  'Línea de vida Horizontal portátil o fija',
  'Eslinga de Posicionamiento / restricción',
  'Eslinga detención de caídas con absorbente',
  'Arnés de cuerpo completo (cert. ANSI/OSHA)',
  'Anclaje fijo estructural (5000 lb / 22.2 kN)',
  'Tie off (Conector de anclaje portátil)',
  'Mosquetones de seguridad con cierre auto.',
  'Línea de vida autorretráctil',
  'Freno o arrestador de caídas (troll)',
  'Red de seguridad para detención',
];

const DEFAULT_PERSONAL = [
  'Casco con barbuquejo 3 o 4 puntos',
  'Guantes antideslizantes / vaqueta',
  'Botas de seguridad dieléctricas',
  'Gafas de seguridad con filtro UV',
  'Protección auditiva de inserción / copa',
  'Protección respiratoria / mascarilla',
];

const DEFAULT_COLLECTIVE = [
  'Señalización y demarcación del área',
  'Manejo de desniveles u orificios',
  'Control de acceso peatonal y vehicular',
  'Delimitación de área (cinta/conos)',
  'Línea de advertencia perimetral',
  'Barandas fijas o temporales',
  'Ayudante de seguridad asignado',
];

export interface ToolValidationError {
  index: number;
  missing: 'qty' | 'name';
}

export interface ToolValidationResult {
  isValid: boolean;
  errors: ToolValidationError[];
  message: string;
}

export function validatePPETools(
  tools?: Array<{ name: string; qty: string }>
): ToolValidationResult {
  const errors: ToolValidationError[] = [];
  (tools || []).forEach((tool, index) => {
    const hasName = (tool?.name || '').trim() !== '';
    const hasQty = (tool?.qty || '').trim() !== '';
    if (hasName && !hasQty) {
      errors.push({ index, missing: 'qty' });
    } else if (!hasName && hasQty) {
      errors.push({ index, missing: 'name' });
    }
  });

  if (errors.length === 0) {
    return { isValid: true, errors: [], message: '' };
  }

  const missingQtyRows = errors.filter((e) => e.missing === 'qty').map((e) => `#${e.index + 1}`);
  const missingNameRows = errors.filter((e) => e.missing === 'name').map((e) => `#${e.index + 1}`);
  const details: string[] = [];
  if (missingQtyRows.length > 0) {
    details.push(`falta cantidad en herramienta ${missingQtyRows.join(', ')}`);
  }
  if (missingNameRows.length > 0) {
    details.push(`falta nombre en fila ${missingNameRows.join(', ')}`);
  }

  return {
    isValid: false,
    errors,
    message: `No se puede guardar: en Herramientas Aseguradas ${details.join(' y ')}.`,
  };
}

interface AutoResizeToolTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}

function AutoResizeToolTextarea({
  value,
  onChange,
  placeholder,
  ariaLabel,
  className = '',
}: AutoResizeToolTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    const resize = () => {
      el.style.height = 'auto';
      if (el.scrollHeight > 0) {
        el.style.height = `${el.scrollHeight}px`;
      } else if (value) {
        const estimatedLines = value
          .split('\n')
          .reduce((acc, line) => acc + Math.max(1, Math.ceil(line.length / 44)), 0);
        el.style.height = `${Math.max(19, estimatedLines * 12 + 6)}px`;
      }
    };

    resize();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => resize());
      observer.observe(el);
      return () => observer.disconnect();
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={`w-full resize-none overflow-hidden leading-tight py-[3px] border-0 bg-transparent outline-none ${className}`}
    />
  );
}

export function PPESection({ data, updateData }: PPESectionProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [customInputs, setCustomInputs] = useState<Record<PPECategory, string>>({
    fallProtection: '',
    personal: '',
    collective: '',
  });

  const handlePPEChange = (category: PPECategory, item: string, value: 'SI' | 'N/A' | '') => {
    updateData({
      ppe: {
        ...data.ppe,
        [category]: {
          ...(data.ppe?.[category] || {}),
          [item]: value,
        },
      },
    });
  };

  const handleRemoveCustomItem = (category: PPECategory, item: string) => {
    const nextCat = { ...(data.ppe?.[category] || {}) };
    delete nextCat[item];
    updateData({
      ppe: {
        ...data.ppe,
        [category]: nextCat,
      },
    });
  };

  const handleBulkCategory = (
    category: PPECategory,
    items: string[],
    mode: 'all-si' | 'remaining-na' | 'clear'
  ) => {
    const current = { ...(data.ppe?.[category] || {}) };
    items.forEach((item) => {
      if (mode === 'all-si') {
        current[item] = 'SI';
      } else if (mode === 'remaining-na') {
        if (!current[item]) {
          current[item] = 'N/A';
        }
      } else if (mode === 'clear') {
        delete current[item];
      }
    });

    updateData({
      ppe: {
        ...data.ppe,
        [category]: current,
      },
    });
  };

  const handleToolChange = (index: number, field: 'name' | 'qty', value: string) => {
    const newTools = [...(data.ppe?.tools || [])];
    while (newTools.length <= index) {
      newTools.push({ name: '', qty: '' });
    }
    newTools[index] = { ...newTools[index], [field]: value };
    updateData({ ppe: { ...data.ppe, tools: newTools } });
  };

  const stepToolQty = (index: number, delta: number) => {
    const currentRaw = data.ppe?.tools?.[index]?.qty || '';
    const parsed = parseInt(currentRaw, 10);
    const nextVal = Number.isNaN(parsed) ? (delta > 0 ? 1 : 0) : Math.max(0, parsed + delta);
    handleToolChange(index, 'qty', nextVal === 0 ? '' : String(nextVal));
  };

  const addTool = () => {
    updateData({ ppe: { ...data.ppe, tools: [...(data.ppe?.tools || []), { name: '', qty: '' }] } });
  };

  const removeTool = (index: number) => {
    const tools = data.ppe?.tools || [];
    if (tools.length <= 1) {
      updateData({ ppe: { ...data.ppe, tools: [{ name: '', qty: '' }] } });
      return;
    }
    const newTools = tools.filter((_, i) => i !== index);
    updateData({ ppe: { ...data.ppe, tools: newTools } });
  };

  const getItems = (category: PPECategory, defaultItems: string[]) => {
    const catObj = data.ppe?.[category] || {};
    const allKeys = Object.keys(catObj);
    const customKeys = allKeys.filter(
      (k) => !defaultItems.includes(k) && k !== 'Otros ¿cuál?' && catObj[k] !== ''
    );
    return [...defaultItems, ...customKeys];
  };

  const fallProtectionItems = getItems('fallProtection', DEFAULT_FALL_PROTECTION);
  const personalItems = getItems('personal', DEFAULT_PERSONAL);
  const collectiveItems = getItems('collective', DEFAULT_COLLECTIVE);

  const countStats = (category: PPECategory, items: string[]) => {
    const catObj = data.ppe?.[category] || {};
    let si = 0;
    let na = 0;
    items.forEach((item) => {
      if (catObj[item] === 'SI') si++;
      else if (catObj[item] === 'N/A') na++;
    });
    return { si, na, total: items.length, done: si + na };
  };

  const fallStats = countStats('fallProtection', fallProtectionItems);
  const personalStats = countStats('personal', personalItems);
  const collectiveStats = countStats('collective', collectiveItems);

  const totalSi = fallStats.si + personalStats.si + collectiveStats.si;
  const totalNa = fallStats.na + personalStats.na + collectiveStats.na;
  const toolsList = data.ppe?.tools || [];
  const activeToolsCount = toolsList.filter((t) => t.name.trim() !== '').length;
  const toolValidation = validatePPETools(toolsList);
  const toolErrorByIndex = new Map<number, 'qty' | 'name'>(
    toolValidation.errors.map((err) => [err.index, err.missing])
  );
  const displayedToolRows = Array.from(
    { length: Math.max(3, toolsList.length) },
    (_, idx) => toolsList[idx] || { name: '', qty: '' }
  );

  const handleAddCustom = (category: PPECategory) => {
    const text = customInputs[category].trim();
    if (!text) return;
    handlePPEChange(category, text, 'SI');
    setCustomInputs((prev) => ({ ...prev, [category]: '' }));
  };

  const renderInteractiveCategory = (
    category: PPECategory,
    title: string,
    subtitle: string,
    icon: React.ReactNode,
    items: string[],
    defaultList: string[],
    stats: { si: number; na: number; total: number; done: number }
  ) => {
    const catMap = data.ppe?.[category] || {};

    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Cabecera de categoría con acciones rápidas */}
        <div className="px-3 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-800 flex items-center justify-center shrink-0">
              {icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">{title}</h4>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 tabular-nums">
                  {stats.si} SI
                </span>
                {stats.na > 0 && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 tabular-nums">
                    {stats.na} N/A
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">{subtitle}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => handleBulkCategory(category, items, 'all-si')}
              className="min-h-[34px] px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 transition-colors"
              title="Marcar todos los elementos estándar como SI"
            >
              <CheckCheck size={13} />
              <span>Todos SI</span>
            </button>
            <button
              type="button"
              onClick={() => handleBulkCategory(category, items, 'remaining-na')}
              className="min-h-[34px] px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1 transition-colors"
              title="Marcar los elementos sin selección como N/A"
            >
              <Minus size={13} />
              <span>Restantes N/A</span>
            </button>
            {stats.done > 0 && (
              <button
                type="button"
                onClick={() => handleBulkCategory(category, items, 'clear')}
                className="min-h-[34px] px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-500 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 flex items-center gap-1 transition-colors"
                title="Limpiar selección de esta categoría"
              >
                <RotateCcw size={12} />
                <span className="hidden sm:inline">Limpiar</span>
              </button>
            )}
          </div>
        </div>

        {/* Grid interactivo de elementos */}
        <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {items.map((item) => {
            const val = catMap[item] || '';
            const isCustom = !defaultList.includes(item);

            return (
              <div
                key={item}
                className={`rounded-lg border p-2 transition-all flex flex-col gap-1.5 ${
                  val === 'SI'
                    ? 'bg-emerald-50/80 border-emerald-400 shadow-2xs'
                    : val === 'N/A'
                    ? 'bg-slate-100/80 border-slate-300'
                    : 'bg-white border-slate-200 hover:border-brand-400'
                }`}
              >
                <div className="flex items-center justify-between gap-2 min-h-[36px]">
                  <button
                    type="button"
                    onClick={() => handlePPEChange(category, item, val === 'SI' ? '' : 'SI')}
                    className="flex-1 flex items-center gap-2 text-left min-w-0 cursor-pointer py-0.5"
                  >
                    <span
                      className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                        val === 'SI'
                          ? 'bg-emerald-600 text-white'
                          : val === 'N/A'
                          ? 'bg-slate-500 text-white'
                          : 'bg-slate-100 border border-slate-300 text-slate-400'
                      }`}
                    >
                      {val === 'SI' ? (
                        <Check size={14} strokeWidth={2.75} />
                      ) : val === 'N/A' ? (
                        <Minus size={14} strokeWidth={2.5} />
                      ) : (
                        <Plus size={13} />
                      )}
                    </span>
                    <span
                      className={`text-xs sm:text-[13px] leading-snug ${
                        val === 'SI'
                          ? 'font-semibold text-emerald-950'
                          : val === 'N/A'
                          ? 'text-slate-500 line-through'
                          : 'font-medium text-slate-800'
                      }`}
                    >
                      {item}
                    </span>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handlePPEChange(category, item, val === 'SI' ? '' : 'SI')}
                      className={`min-h-[34px] min-w-[38px] px-2 rounded-md text-[11px] font-bold border transition-colors ${
                        val === 'SI'
                          ? 'bg-emerald-600 text-white border-emerald-700'
                          : 'bg-white text-slate-600 border-slate-300 hover:border-emerald-400 hover:text-emerald-800'
                      }`}
                    >
                      SI
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePPEChange(category, item, val === 'N/A' ? '' : 'N/A')}
                      className={`min-h-[34px] min-w-[40px] px-2 rounded-md text-[11px] font-bold border transition-colors ${
                        val === 'N/A'
                          ? 'bg-slate-600 text-white border-slate-700'
                          : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      N/A
                    </button>
                    {isCustom && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomItem(category, item)}
                        className="min-h-[34px] min-w-[32px] px-1.5 rounded-md text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 flex items-center justify-center transition-colors"
                        title="Eliminar elemento personalizado"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Barra para agregar ítem personalizado */}
        <div className="px-2.5 pb-2.5 flex items-center gap-2">
          <input
            type="text"
            value={customInputs[category]}
            onChange={(e) => setCustomInputs((prev) => ({ ...prev, [category]: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustom(category);
              }
            }}
            placeholder={`Agregar otro elemento en ${title.toLowerCase()}...`}
            className="flex-1 min-h-[38px] px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:bg-white focus:border-brand-600 text-slate-900"
          />
          <button
            type="button"
            onClick={() => handleAddCustom(category)}
            disabled={!customInputs[category].trim()}
            className="min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-700 hover:bg-brand-800 text-white disabled:opacity-40 flex items-center gap-1 transition-colors shrink-0"
          >
            <Plus size={14} />
            <span>Agregar</span>
          </button>
        </div>
      </div>
    );
  };

  /* Fila compacta para el formato oficial imprimible / PDF */
  const PrintablePPERow: React.FC<{ category: PPECategory; item: string }> = ({ category, item }) => {
    const val = data.ppe?.[category]?.[item];

    return (
      <div
        className={`flex border-b border-black text-[9px] min-h-[21px] items-stretch ${
          val === 'SI' ? 'bg-emerald-50/70' : val === 'N/A' ? 'bg-slate-100/70' : 'bg-white'
        }`}
      >
        <div className="flex-1 px-1.5 py-[3px] border-r border-black flex items-center text-left min-w-0">
          <span
            className={`leading-snug break-words ${
              val === 'SI'
                ? 'font-bold text-emerald-950'
                : val === 'N/A'
                ? 'text-slate-600 font-medium'
                : 'text-black font-medium'
            }`}
          >
            {item}
          </span>
        </div>
        <div className="w-14 flex divide-x divide-black shrink-0 bg-white">
          <div className={`w-7 flex items-center justify-center ${val === 'SI' ? 'bg-emerald-100' : ''}`}>
            <div
              className={`w-3.5 h-3.5 border border-black flex items-center justify-center ${
                val === 'SI' ? 'bg-emerald-700 text-white' : 'bg-white'
              }`}
            >
              {val === 'SI' && (
                <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 block" aria-hidden="true">
                  <path d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              )}
            </div>
          </div>
          <div className={`w-7 flex items-center justify-center ${val === 'N/A' ? 'bg-slate-200' : ''}`}>
            <div
              className={`w-3.5 h-3.5 border border-black flex items-center justify-center ${
                val === 'N/A' ? 'bg-slate-700 text-white' : 'bg-white'
              }`}
            >
              {val === 'N/A' && (
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

  return (
    <div className="border border-black mb-1.5 relative bg-white shadow-2xs avoid-break">
      {/* Header institucional */}
      <div className="bg-brand-700 text-white font-bold py-1.5 px-2 text-[11px] uppercase tracking-wider text-center relative border-b border-black flex items-center justify-center leading-snug">
        <span>IV. ELEMENTOS DE PROTECCIÓN Y MEDIDAS PREVENTIVAS</span>
        <span className="hidden sm:inline-block absolute right-2 text-[8.5px] font-normal text-brand-100 leading-normal">
          Marque con una (X) [SI] o [N/A]
        </span>
      </div>

      {/* =================================================================
          INTERFAZ INTERACTIVA EN PANTALLA (Oculta en Vista Previa / PDF / Print)
          ================================================================= */}
      <div className="print:hidden bg-slate-100/70 p-2.5 sm:p-3 space-y-3">
        {/* Barra de resumen y filtros por categoría */}
        <div className="bg-white border border-slate-200 rounded-xl p-2 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'fallProtection' ? 'all' : 'fallProtection')}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'fallProtection'
                  ? 'bg-brand-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Shield size={14} />
              <span>Contra Caídas ({fallStats.si})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'personal' ? 'all' : 'personal')}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'personal'
                  ? 'bg-brand-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <HardHat size={14} />
              <span>EPP Personal ({personalStats.si})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'collective' ? 'all' : 'collective')}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'collective'
                  ? 'bg-brand-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <AlertTriangle size={14} />
              <span>Medidas Colectivas ({collectiveStats.si})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'tools' ? 'all' : 'tools')}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'tools'
                  ? 'bg-brand-700 text-white shadow-2xs'
                  : !toolValidation.isValid
                  ? 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Wrench size={14} />
              <span>Herramientas ({activeToolsCount})</span>
              {!toolValidation.isValid && (
                <AlertTriangle size={13} className={activeTab === 'tools' ? 'text-amber-300' : 'text-amber-600'} />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600 px-1 shrink-0">
            <span className="font-semibold text-emerald-700 tabular-nums">{totalSi} seleccionados</span>
            <span className="text-slate-300">·</span>
            <span className="tabular-nums">{totalNa} N/A</span>
          </div>
        </div>

        {/* Categoría 1: Protección Contra Caídas */}
        {(activeTab === 'all' || activeTab === 'fallProtection') &&
          renderInteractiveCategory(
            'fallProtection',
            'Protección Contra Caídas en Altura',
            'Toque cada elemento para activarlo (SI) o marque N/A si no aplica a la tarea.',
            <Shield size={16} />,
            fallProtectionItems,
            DEFAULT_FALL_PROTECTION,
            fallStats
          )}

        {/* Categoría 2: Protección Personal (EPP) */}
        {(activeTab === 'all' || activeTab === 'personal') &&
          renderInteractiveCategory(
            'personal',
            'Elementos de Protección Personal (EPP)',
            'Equipos básicos requeridos para cada trabajador en la actividad.',
            <HardHat size={16} />,
            personalItems,
            DEFAULT_PERSONAL,
            personalStats
          )}

        {/* Categoría 3: Medidas Colectivas de Prevención */}
        {(activeTab === 'all' || activeTab === 'collective') &&
          renderInteractiveCategory(
            'collective',
            'Medidas Colectivas de Prevención',
            'Señalización, control de acceso y barreras preventivas en el área.',
            <AlertTriangle size={16} />,
            collectiveItems,
            DEFAULT_COLLECTIVE,
            collectiveStats
          )}

        {/* Categoría 4: Herramientas Aseguradas */}
        {(activeTab === 'all' || activeTab === 'tools') && (
          <div id="ppe-tools-section" className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="px-3 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-800 flex items-center justify-center shrink-0">
                  <Wrench size={16} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    Herramientas Aseguradas contra Caída de Objetos
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Registre las herramientas manuales o eléctricas amarradas con porta-herramienta.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={addTool}
                className="min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-700 hover:bg-brand-800 text-white flex items-center gap-1 transition-colors shrink-0"
              >
                <Plus size={14} />
                <span>Herramienta</span>
              </button>
            </div>

            {!toolValidation.isValid && (
              <div
                role="alert"
                className="mx-2.5 mt-2.5 px-3 py-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-medium flex items-center gap-2"
              >
                <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                <span>
                  Cada herramienta debe tener <strong>nombre y cantidad</strong> (o ambos vacíos). Completa los campos resaltados para poder guardar.
                </span>
              </div>
            )}

            <div className="p-2.5 space-y-2">
              {toolsList.map((tool, idx) => {
                const rowError = toolErrorByIndex.get(idx);
                return (
                  <div
                    key={idx}
                    className={`flex flex-col gap-1.5 p-2 rounded-lg border transition-colors ${
                      rowError
                        ? 'border-amber-400 bg-amber-50/50'
                        : 'border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <AutoResizeToolTextarea
                        value={tool.name}
                        onChange={(val) => handleToolChange(idx, 'name', val)}
                        placeholder={`Herramienta #${idx + 1} (Ej. Taladro inalámbrico con eslinga portaherramienta)`}
                        ariaLabel={`Herramienta ${idx + 1}`}
                        className={`flex-1 min-h-[38px] px-3 py-2 text-xs !bg-white !border rounded-lg focus:border-brand-600 text-slate-900 font-medium ${
                          rowError === 'name' ? '!border-red-400' : '!border-slate-300'
                        }`}
                      />
                      <div className="flex items-center justify-between sm:justify-end gap-2">
                        <div
                          className={`flex items-center border rounded-lg bg-white overflow-hidden ${
                            rowError === 'qty' ? 'border-red-400 ring-1 ring-red-200' : 'border-slate-300'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => stepToolQty(idx, -1)}
                            className="w-9 h-9 shrink-0 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                            aria-label="Disminuir cantidad"
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={tool.qty}
                            onChange={(e) => handleToolChange(idx, 'qty', e.target.value)}
                            placeholder="0"
                            className="w-12 h-9 shrink-0 flex-none px-1 text-center text-xs font-bold text-brand-950 tabular-nums outline-none border-x border-slate-200 bg-transparent"
                            aria-label="Cantidad"
                          />
                          <button
                            type="button"
                            onClick={() => stepToolQty(idx, 1)}
                            className="w-9 h-9 shrink-0 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                            aria-label="Aumentar cantidad"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTool(idx)}
                          className="w-9 h-9 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                          title="Quitar herramienta"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {rowError && (
                      <p className="text-[11px] font-semibold text-red-700 flex items-center gap-1 px-0.5">
                        <AlertTriangle size={12} className="shrink-0" />
                        <span>
                          {rowError === 'qty'
                            ? 'Falta indicar la cantidad para esta herramienta.'
                            : 'Falta ingresar el nombre de la herramienta para esta cantidad.'}
                        </span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* =================================================================
          MATRIZ OFICIAL COMPACTA PARA VISTA PREVIA, PDF E IMPRESIÓN
          ================================================================= */}
      <div className="hidden print:block">
        <div className="grid grid-cols-3 divide-y-0 divide-x divide-black">
          {/* Columna 1: Protección contra caídas */}
          <div className="flex flex-col">
            <div className="bg-brand-100/90 font-bold text-[9px] sm:text-[9.5px] text-center flex border-b border-black text-black min-h-[24px] items-stretch">
              <div className="flex-1 px-1.5 py-1 border-r border-black flex items-center justify-center text-center uppercase tracking-tight font-black leading-snug">
                Protección Contra Caídas
              </div>
              <div className="w-14 flex divide-x divide-black shrink-0">
                <div className="w-7 flex items-center justify-center text-center text-emerald-950 font-black">SI</div>
                <div className="w-7 flex items-center justify-center text-center text-slate-800 font-black">N/A</div>
              </div>
            </div>
            <div className="flex flex-col flex-1">
              {fallProtectionItems.map((item) => (
                <PrintablePPERow key={item} category="fallProtection" item={item} />
              ))}
              <div className="flex-1 bg-slate-50/40" />
            </div>
          </div>

          {/* Columna 2: EPP Personal y Herramientas Aseguradas */}
          <div className="flex flex-col">
            <div className="bg-brand-100/90 font-bold text-[9px] sm:text-[9.5px] text-center flex border-b border-black text-black min-h-[24px] items-stretch">
              <div className="flex-1 px-1.5 py-1 border-r border-black flex items-center justify-center text-center uppercase tracking-tight font-black leading-snug">
                Protección Personal (EPP)
              </div>
              <div className="w-14 flex divide-x divide-black shrink-0">
                <div className="w-7 flex items-center justify-center text-center text-emerald-950 font-black">SI</div>
                <div className="w-7 flex items-center justify-center text-center text-slate-800 font-black">N/A</div>
              </div>
            </div>
            <div className="flex flex-col">
              {personalItems.map((item) => (
                <PrintablePPERow key={item} category="personal" item={item} />
              ))}
            </div>

            {/* Sub-tabla Herramientas Aseguradas en tabla HTML con bordes cerrados */}
            <div className="flex-1 flex flex-col">
              <table className="w-full border-collapse table-fixed text-[9px]" style={{ borderSpacing: 0 }}>
                <colgroup>
                  <col />
                  <col style={{ width: '48px' }} />
                </colgroup>
                <thead>
                  <tr className="bg-brand-100/90 font-bold text-[9px] sm:text-[9.5px] text-black">
                    <th className="border-b border-r border-black px-1.5 py-1 text-center uppercase tracking-tight font-black leading-snug align-middle relative">
                      <span>Herramientas</span>
                      <button
                        type="button"
                        onClick={addTool}
                        className="print:hidden absolute right-1 top-1/2 -translate-y-1/2 px-1 py-0.5 rounded bg-brand-700 hover:bg-brand-800 text-white text-[7.5px] font-semibold normal-case tracking-normal flex items-center gap-0.5 cursor-pointer"
                        title="Agregar herramienta"
                      >
                        + Herramienta
                      </button>
                    </th>
                    <th className="border-b border-black px-1 py-1 text-center font-black text-black align-middle">
                      Cant.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayedToolRows.map((tool, idx) => {
                    const hasToolEntry = idx < toolsList.length;
                    return (
                      <tr key={idx} className="bg-white" style={{ height: '22px' }}>
                        <td className="border-b border-r border-black px-1.5 py-0.5 text-left align-middle bg-white">
                          <div className="flex items-center justify-start gap-1 min-w-0">
                            <AutoResizeToolTextarea
                              value={tool.name}
                              onChange={(val) => handleToolChange(idx, 'name', val)}
                              ariaLabel={`Herramienta ${idx + 1}`}
                              className="text-[9px] text-black text-left font-medium"
                            />
                            {hasToolEntry && toolsList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeTool(idx)}
                                className="print:hidden p-0.5 text-slate-400 hover:text-red-600 transition-colors shrink-0 cursor-pointer"
                                title="Quitar herramienta"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="border-b border-black p-0 text-center align-middle bg-white">
                          <input
                            type="text"
                            value={tool.qty}
                            onChange={(e) => handleToolChange(idx, 'qty', e.target.value)}
                            className="w-full text-center font-mono text-[9px] font-bold text-black bg-transparent border-0 outline-none tabular-nums py-[3px] px-0.5 leading-snug"
                            aria-label={`Cantidad herramienta ${idx + 1}`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="flex-1 bg-slate-50/40" />
            </div>
          </div>

          {/* Columna 3: Medidas Colectivas de Prevención */}
          <div className="flex flex-col">
            <div className="bg-brand-100/90 font-bold text-[9px] sm:text-[9.5px] text-center flex border-b border-black text-black min-h-[24px] items-stretch">
              <div className="flex-1 px-1.5 py-1 border-r border-black flex items-center justify-center text-center uppercase tracking-tight font-black leading-snug">
                Medidas Colectivas Prevención
              </div>
              <div className="w-14 flex divide-x divide-black shrink-0">
                <div className="w-7 flex items-center justify-center text-center text-emerald-950 font-black">SI</div>
                <div className="w-7 flex items-center justify-center text-center text-slate-800 font-black">N/A</div>
              </div>
            </div>
            <div className="flex flex-col flex-1">
              {collectiveItems.map((item) => (
                <PrintablePPERow key={item} category="collective" item={item} />
              ))}
              <div className="flex-1 bg-slate-50/40" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
