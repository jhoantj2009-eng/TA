import React, { useMemo, useState } from 'react';
import {
  X,
  Search,
  Copy,
  FolderOpen,
  Trash2,
  Save,
  PlusCircle,
  History,
  MapPin,
  Calendar,
  Users,
  CheckCircle2,
  LogOut,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { PermitData, PermitHistoryRecord, PermitStatus } from '../types';
import { useCloudSync } from './CloudSyncContext';
import { buildDuplicatedPermitData, getNextPermitNumber } from '../services/firestoreStorage';
import { validatePPETools } from './PPESection';

interface PermitHistoryModalProps {
  currentData: PermitData;
  onLoadPermit: (record: PermitHistoryRecord) => void;
  onDuplicatePermit: (duplicatedData: PermitData, newId: string, status: PermitStatus) => void;
  onNotify: (message: string) => void;
}

const STATUS_LABELS: Record<PermitStatus, string> = {
  borrador: 'Borrador',
  activo: 'Activo',
  cerrado: 'Cerrado',
};

const STATUS_BADGE_CLASSES: Record<PermitStatus, string> = {
  borrador: 'bg-slate-100 text-slate-700 border-slate-300',
  activo: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  cerrado: 'bg-brand-50 text-brand-900 border-brand-300',
};

export function PermitHistoryModal({
  currentData,
  onLoadPermit,
  onDuplicatePermit,
  onNotify,
}: PermitHistoryModalProps) {
  const {
    user,
    signingIn,
    authError,
    permits,
    dataLoading,
    activePermitId,
    activePermitStatus,
    signInWithGoogle,
    signOutGoogle,
    savePermit,
    deletePermit,
    isHistoryOpen,
    closeHistory,
  } = useCloudSync();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PermitStatus>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savingCurrent, setSavingCurrent] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c = { all: permits.length, borrador: 0, activo: 0, cerrado: 0 };
    for (const p of permits) {
      if (p.status === 'borrador') c.borrador++;
      else if (p.status === 'activo') c.activo++;
      else if (p.status === 'cerrado') c.cerrado++;
    }
    return c;
  }, [permits]);

  const filteredPermits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return permits.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = [
        p.permitNumber,
        p.date,
        p.validUntil,
        p.location,
        p.workType,
        p.workHeight,
        p.contractingCompany,
        p.contractorCompany,
        p.activityDescription,
        p.workerSummary,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [permits, searchQuery, statusFilter]);

  if (!isHistoryOpen) return null;

  const handleSaveCurrent = async (forceNew: boolean) => {
    setLocalError(null);
    const toolValidation = validatePPETools(currentData.ppe?.tools);
    if (!toolValidation.isValid) {
      setLocalError(toolValidation.message);
      return;
    }
    setSavingCurrent(true);
    try {
      const res = await savePermit(currentData, forceNew);
      if (res) {
        onNotify(
          forceNew || !activePermitId
            ? `Permiso N° ${currentData.permitNumber || '001'} guardado en el historial.`
            : `Permiso N° ${currentData.permitNumber || '001'} actualizado en el historial.`
        );
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'No se pudo guardar el permiso.');
    } finally {
      setSavingCurrent(false);
    }
  };

  const handleDuplicate = async (record: PermitHistoryRecord) => {
    setLocalError(null);
    setBusyId(record.id);
    try {
      const nextNumber = getNextPermitNumber(permits, currentData.permitNumber);
      const duplicated = buildDuplicatedPermitData(record.permitData, nextNumber);
      const saved = await savePermit(duplicated, true);
      if (saved) {
        onDuplicatePermit(duplicated, saved.id, saved.status);
        onNotify(`Permiso duplicado como N° ${nextNumber} y cargado para editar.`);
        closeHistory();
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Error al duplicar el permiso.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (permitId: string) => {
    setLocalError(null);
    setBusyId(permitId);
    try {
      await deletePermit(permitId);
      setConfirmDeleteId(null);
      onNotify('Permiso eliminado del historial.');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'No se pudo eliminar el permiso.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-2 sm:p-4 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Historial de Permisos de Trabajo en Alturas"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-brand-700/40 border border-brand-500/40 flex items-center justify-center shrink-0">
              <History size={18} className="text-brand-200" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold truncate">
                Historial y Búsqueda de Permisos
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                Consulta, reabre, duplica o administra permisos guardados en la nube
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {user && (
              <button
                type="button"
                onClick={signOutGoogle}
                title={`Conectado como ${user.email || 'Usuario'} — Cerrar sesión`}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium border border-slate-700 transition-colors cursor-pointer"
              >
                <span className="max-w-[140px] truncate">{user.email}</span>
                <LogOut size={13} />
              </button>
            )}
            <button
              type="button"
              onClick={closeHistory}
              className="min-h-[38px] min-w-[38px] rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
              aria-label="Cerrar historial"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Auth Gate or Content */}
        {!user ? (
          <div className="p-6 sm:p-10 flex flex-col items-center justify-center text-center gap-4 overflow-y-auto">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-700">
              <History size={28} />
            </div>
            <div className="max-w-md">
              <h3 className="text-base font-bold text-slate-900 mb-1.5">
                Conecta tu cuenta para ver tu historial en la nube
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Inicia sesión con Google para guardar tus permisos de trabajo en alturas, buscarlos por número, área o trabajador, y duplicarlos en segundos desde cualquier dispositivo.
              </p>
            </div>

            {authError && (
              <div className="max-w-md w-full p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 text-left">
                <AlertCircle size={16} className="shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={signingIn}
              className="min-h-[44px] px-5 py-2.5 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-60"
            >
              {signingIn ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              <span>{signingIn ? 'Conectando...' : 'Continuar con Google'}</span>
            </button>
          </div>
        ) : (
          <>
            {/* Save Current Permit Bar */}
            <div className="px-3 sm:px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
              <div className="text-xs text-slate-700 flex items-center gap-2 min-w-0">
                <span className="font-mono font-bold px-2 py-0.5 rounded bg-brand-100 text-brand-900 border border-brand-200 shrink-0">
                  Actual: N° {currentData.permitNumber || '001'}
                </span>
                <span className="truncate text-slate-600">
                  {activePermitId
                    ? activePermitStatus === 'cerrado'
                      ? 'Permiso cerrado (solo lectura, puedes duplicarlo o guardar copia)'
                      : 'Editando registro guardado en el historial'
                    : 'Permiso aún no archivado en el historial'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {activePermitId && activePermitStatus !== 'cerrado' && (
                  <button
                    type="button"
                    disabled={savingCurrent}
                    onClick={() => handleSaveCurrent(false)}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {savingCurrent ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    <span>Actualizar en historial</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={savingCurrent}
                  onClick={() => handleSaveCurrent(true)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 ${
                    activePermitId && activePermitStatus !== 'cerrado'
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                      : 'bg-brand-700 hover:bg-brand-800 text-white'
                  }`}
                >
                  <PlusCircle size={14} />
                  <span>{activePermitId ? 'Guardar como nuevo' : 'Guardar en historial'}</span>
                </button>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="px-3 sm:px-4 py-2.5 bg-white border-b border-slate-200 flex flex-col gap-2 shrink-0">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por N° de permiso, fecha, lugar, actividad, empresa o trabajador..."
                  className="w-full min-h-[40px] pl-9 pr-9 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-brand-600 bg-slate-50 focus:bg-white"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                    aria-label="Limpiar búsqueda"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { key: 'all', label: `Todos (${counts.all})` },
                    { key: 'borrador', label: `Borrador (${counts.borrador})` },
                    { key: 'activo', label: `Activo (${counts.activo})` },
                    { key: 'cerrado', label: `Cerrado (${counts.cerrado})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusFilter(tab.key)}
                    className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      statusFilter === tab.key
                        ? 'bg-brand-700 text-white border-brand-800'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {localError && (
                <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{localError}</span>
                </div>
              )}
            </div>

            {/* Permits List */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 bg-slate-50">
              {dataLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                  <Loader2 size={24} className="animate-spin text-brand-600" />
                  <span>Cargando historial de permisos...</span>
                </div>
              ) : filteredPermits.length === 0 ? (
                <div className="py-12 text-center bg-white rounded-xl border border-dashed border-slate-300 p-6">
                  <History size={28} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">
                    {permits.length === 0
                      ? 'Aún no hay permisos guardados en tu historial'
                      : 'No se encontraron permisos con esa búsqueda'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {permits.length === 0
                      ? 'Haz clic en "Guardar en historial" para archivar el permiso actual y tenerlo disponible luego.'
                      : 'Prueba con otro número de permiso, trabajador, fecha o cambia el filtro de estado.'}
                  </p>
                </div>
              ) : (
                filteredPermits.map((record) => {
                  const isCurrent = activePermitId === record.id;
                  const isBusy = busyId === record.id;
                  return (
                    <div
                      key={record.id}
                      className={`bg-white rounded-xl border p-3 sm:p-3.5 shadow-2xs transition-colors ${
                        isCurrent ? 'border-brand-500 ring-1 ring-brand-200' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-900 text-white">
                              N° {record.permitNumber || '---'}
                            </span>
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                                STATUS_BADGE_CLASSES[record.status] || STATUS_BADGE_CLASSES.borrador
                              }`}
                            >
                              {STATUS_LABELS[record.status] || 'Borrador'}
                            </span>
                            {isCurrent && (
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-800 border border-brand-200">
                                Abierto en editor
                              </span>
                            )}
                            {record.workHeight && (
                              <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                Altura: {record.workHeight}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-slate-700">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <MapPin size={13} className="text-slate-400 shrink-0" />
                              <span className="truncate font-medium">
                                {record.location || 'Sin ubicación especificada'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Calendar size={13} className="text-slate-400 shrink-0" />
                              <span className="truncate">
                                {record.date ? `Expedición: ${record.date}` : 'Sin fecha'}
                                {record.validUntil ? ` · Hasta: ${record.validUntil}` : ''}
                              </span>
                            </div>
                          </div>

                          {record.activityDescription && (
                            <p className="text-xs text-slate-600 line-clamp-2">
                              {record.activityDescription}
                            </p>
                          )}

                          {record.workerSummary && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                              <Users size={12} className="shrink-0 text-slate-400" />
                              <span className="truncate">{record.workerSummary}</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap sm:flex-col items-stretch sm:items-end gap-1.5 shrink-0 pt-1 sm:pt-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                onLoadPermit(record);
                                closeHistory();
                              }}
                              className="min-h-[38px] px-3 py-1.5 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <FolderOpen size={14} />
                              <span>Abrir</span>
                            </button>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleDuplicate(record)}
                              className="min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                              title="Crear una copia nueva de este permiso con el siguiente consecutivo"
                            >
                              {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
                              <span>Duplicar</span>
                            </button>

                            {confirmDeleteId === record.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleDelete(record.id)}
                                  className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
                                >
                                  Confirmar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="min-h-[38px] px-2 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 text-xs font-medium cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => setConfirmDeleteId(record.id)}
                                className="min-h-[38px] min-w-[38px] px-2 py-1.5 rounded-lg text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 flex items-center justify-center transition-colors cursor-pointer"
                                title="Eliminar del historial"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>

                          {record.updatedAt && (
                            <span className="text-[10px] text-slate-400">
                              Actualizado:{' '}
                              {record.updatedAt.toLocaleDateString()}{' '}
                              {record.updatedAt.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
