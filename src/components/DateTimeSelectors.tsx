import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';

interface DateSelectorProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEK_DAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

function parseDateParts(value: string): { year: number; month: number; day: number } | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function formatDisplayDate(value: string): string {
  const parts = parseDateParts(value);
  if (!parts) return value;
  const dd = String(parts.day).padStart(2, '0');
  const mm = String(parts.month + 1).padStart(2, '0');
  return `${dd}/${mm}/${parts.year}`;
}

function toISODate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function DateSelector({
  value,
  onChange,
  placeholder = 'Elegir fecha',
  className = '',
  ariaLabel = 'Seleccionar fecha',
}: DateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const now = new Date();
  const parsed = parseDateParts(value);
  const [viewYear, setViewYear] = useState<number>(parsed?.year ?? now.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(parsed?.month ?? now.getMonth());

  useEffect(() => {
    if (isOpen) {
      const current = parseDateParts(value);
      const today = new Date();
      setViewYear(current?.year ?? today.getFullYear());
      setViewMonth(current?.month ?? today.getMonth());
    }
  }, [isOpen, value]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  // Convert JS Sunday=0..Saturday=6 to Monday=0..Sunday=6
  const firstDayOffset = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;

  const yearOptions: number[] = [];
  const baseYear = now.getFullYear();
  for (let y = baseYear - 5; y <= baseYear + 5; y++) {
    yearOptions.push(y);
  }

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    onChange(toISODate(viewYear, viewMonth, day));
    setIsOpen(false);
  };

  const handleToday = () => {
    const t = new Date();
    onChange(toISODate(t.getFullYear(), t.getMonth(), t.getDate()));
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  const todayISO = toISODate(now.getFullYear(), now.getMonth(), now.getDate());

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={ariaLabel}
        className={`flex items-center justify-center gap-1.5 text-center outline-none cursor-pointer hover:bg-brand-50/60 transition-colors ${className}`}
      >
        <span className="truncate tabular-nums">
          {value ? (
            formatDisplayDate(value)
          ) : (
            <span className="text-slate-400 font-normal italic print:hidden">{placeholder}</span>
          )}
        </span>
        <Calendar size={12} className="text-brand-700 shrink-0 print:hidden" />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:hidden"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-xs overflow-hidden border border-slate-200 text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-brand-700 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Calendar size={16} />
                <span>{ariaLabel}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-brand-800 transition-colors"
                aria-label="Cerrar selector de fecha"
              >
                <X size={18} />
              </button>
            </div>

            {/* Selectores de Mes y Año */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-1.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 shrink-0"
                title="Mes anterior"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <select
                  value={viewMonth}
                  onChange={(e) => setViewMonth(Number(e.target.value))}
                  className="flex-1 min-w-0 px-2 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-brand-600"
                  aria-label="Mes"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={name} value={idx}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  value={viewYear}
                  onChange={(e) => setViewYear(Number(e.target.value))}
                  className="w-20 px-2 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-800 tabular-nums focus:outline-none focus:border-brand-600"
                  aria-label="Año"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 shrink-0"
                title="Mes siguiente"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Calendario de Días */}
            <div className="p-3">
              <div className="grid grid-cols-7 gap-1 mb-1.5 text-center text-[11px] font-bold text-slate-500">
                {WEEK_DAYS.map((wd) => (
                  <div key={wd} className="py-1">
                    {wd}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDayOffset }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const iso = toISODate(viewYear, viewMonth, day);
                  const isSelected = iso === value;
                  const isToday = iso === todayISO;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleSelectDay(day)}
                      className={`min-h-[38px] rounded-lg text-xs font-semibold tabular-nums transition-colors flex items-center justify-center cursor-pointer ${
                        isSelected
                          ? 'bg-brand-700 text-white font-bold shadow-xs'
                          : isToday
                          ? 'bg-brand-50 text-brand-800 border border-brand-400 hover:bg-brand-100'
                          : 'text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer de acciones rápidas */}
            <div className="px-3 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="px-3.5 py-1.5 text-xs font-semibold bg-brand-700 hover:bg-brand-800 text-white rounded-lg transition-colors"
              >
                Hoy
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface TimeSelectorProps {
  value: string; // HH:MM
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const QUICK_TIMES = ['06:00', '07:00', '08:00', '12:00', '13:00', '16:00', '17:00', '18:00'];

function formatHourLabel(hourStr: string): string {
  const h = Number(hourStr);
  const suffix = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${hourStr} (${h12} ${suffix})`;
}

export function TimeSelector({
  value,
  onChange,
  placeholder = '--:--',
  className = '',
  ariaLabel = 'Seleccionar hora',
}: TimeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const parseTime = (val: string) => {
    const match = /^(\d{2}):(\d{2})$/.exec((val || '').trim());
    if (match) return { h: match[1], m: match[2] };
    return { h: '08', m: '00' };
  };

  const [selectedHour, setSelectedHour] = useState<string>(() => parseTime(value).h);
  const [selectedMinute, setSelectedMinute] = useState<string>(() => parseTime(value).m);

  useEffect(() => {
    if (isOpen) {
      const parsed = parseTime(value);
      setSelectedHour(parsed.h);
      setSelectedMinute(parsed.m);
    }
  }, [isOpen, value]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const handleApply = () => {
    onChange(`${selectedHour}:${selectedMinute}`);
    setIsOpen(false);
  };

  const handleNow = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    onChange(`${h}:${m}`);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={ariaLabel}
        className={`flex items-center justify-center gap-1 outline-none cursor-pointer hover:bg-brand-50/60 transition-colors ${className}`}
      >
        <span className="tabular-nums truncate">
          {value ? (
            value
          ) : (
            <span className="text-slate-400 font-normal print:hidden">{placeholder}</span>
          )}
        </span>
        <Clock size={11} className="text-brand-700 shrink-0 print:hidden" />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:hidden"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-xs overflow-hidden border border-slate-200 text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-brand-700 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Clock size={16} />
                <span>{ariaLabel}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-brand-800 transition-colors"
                aria-label="Cerrar selector de hora"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Selectores explícitos de Hora y Minuto */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hora
                  </label>
                  <select
                    value={selectedHour}
                    onChange={(e) => setSelectedHour(e.target.value)}
                    className="w-full min-h-[42px] px-2.5 py-2 text-sm font-semibold bg-white border border-slate-300 rounded-lg text-slate-900 tabular-nums focus:outline-none focus:border-brand-600"
                    aria-label="Hora"
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>
                        {formatHourLabel(h)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Minutos
                  </label>
                  <select
                    value={selectedMinute}
                    onChange={(e) => setSelectedMinute(e.target.value)}
                    className="w-full min-h-[42px] px-2.5 py-2 text-sm font-semibold bg-white border border-slate-300 rounded-lg text-slate-900 tabular-nums focus:outline-none focus:border-brand-600"
                    aria-label="Minutos"
                  >
                    {MINUTES.map((m) => (
                      <option key={m} value={m}>
                        {m} min
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Horarios frecuentes */}
              <div>
                <div className="text-[11px] font-semibold text-slate-500 mb-1.5">
                  Horarios frecuentes
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {QUICK_TIMES.map((preset) => {
                    const isActive = `${selectedHour}:${selectedMinute}` === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          onChange(preset);
                          setIsOpen(false);
                        }}
                        className={`min-h-[36px] rounded-lg text-xs font-semibold tabular-nums border transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-brand-700 text-white border-brand-800'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-brand-50 hover:border-brand-300'
                        }`}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-3 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Limpiar
                </button>
                <button
                  type="button"
                  onClick={handleNow}
                  className="px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50 border border-brand-200 rounded-lg transition-colors"
                >
                  Ahora
                </button>
              </div>
              <button
                type="button"
                onClick={handleApply}
                className="px-3.5 py-1.5 text-xs font-semibold bg-brand-700 hover:bg-brand-800 text-white rounded-lg flex items-center gap-1 transition-colors"
              >
                <Check size={14} />
                <span>Aplicar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
