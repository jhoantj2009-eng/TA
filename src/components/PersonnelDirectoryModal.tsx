import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Search,
  UserPlus,
  Edit3,
  Trash2,
  Check,
  Users,
  PenTool,
  AlertCircle,
  Loader2,
  CheckCircle2,
  LogOut,
  ArrowLeft,
} from 'lucide-react';
import {
  PersonnelCategory,
  PersonnelDocType,
  PersonnelRecord,
} from '../types';
import { useCloudSync } from './CloudSyncContext';
import { SignaturePad } from './SignaturePad';
import { isSignatureFilled } from '../utils/signatureValidation';

interface PersonnelDirectoryModalProps {
  onNotify: (message: string) => void;
}

const CATEGORY_LABELS: Record<PersonnelCategory, string> = {
  worker: 'Trabajador',
  coordinator: 'Coordinador SST',
  authorizer: 'Autorizador',
  emergencyActivator: 'Plan Emergencias',
  safetyHelper: 'Ayudante Seg.',
  general: 'General',
};

interface FormState {
  id: string | null;
  name: string;
  docType: PersonnelDocType;
  docNumber: string;
  category: PersonnelCategory;
  role: string;
  em: boolean;
  ss: boolean;
  ca: boolean;
  pa: boolean;
  signature: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  id: null,
  name: '',
  docType: 'CC',
  docNumber: '',
  category: 'worker',
  role: '',
  em: true,
  ss: true,
  ca: true,
  pa: true,
  signature: '',
  notes: '',
};

export function PersonnelDirectoryModal({ onNotify }: PersonnelDirectoryModalProps) {
  const {
    user,
    signingIn,
    authError,
    personnel,
    dataLoading,
    signInWithGoogle,
    signOutGoogle,
    savePerson,
    deletePerson,
    isDirectoryOpen,
    directoryOptions,
    closeDirectory,
  } = useCloudSync();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | PersonnelCategory>('all');
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isDirectoryOpen) {
      setCategoryFilter(directoryOptions.filterCategory || 'all');
      setViewMode('list');
      setFormError(null);
      setConfirmDeleteId(null);
    }
  }, [isDirectoryOpen, directoryOptions.filterCategory]);

  const filteredPersonnel = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return personnel.filter((person) => {
      if (categoryFilter !== 'all' && person.category !== categoryFilter) return false;
      if (!q) return true;
      const haystack = [
        person.name,
        person.docNumber,
        person.docType,
        person.role,
        CATEGORY_LABELS[person.category] || '',
        person.notes,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [personnel, searchQuery, categoryFilter]);

  if (!isDirectoryOpen) return null;

  const isSelectMode = typeof directoryOptions.onSelect === 'function';

  const openCreateForm = () => {
    const defaultCat =
      directoryOptions.filterCategory && directoryOptions.filterCategory !== 'all'
        ? directoryOptions.filterCategory
        : 'worker';
    setForm({
      ...EMPTY_FORM,
      category: defaultCat,
    });
    setFormError(null);
    setViewMode('form');
  };

  const openEditForm = (person: PersonnelRecord) => {
    setForm({
      id: person.id,
      name: person.name,
      docType: person.docType || 'CC',
      docNumber: person.docNumber || '',
      category: person.category || 'worker',
      role: person.role || '',
      em: Boolean(person.em),
      ss: Boolean(person.ss),
      ca: Boolean(person.ca),
      pa: Boolean(person.pa),
      signature: person.signature || '',
      notes: person.notes || '',
    });
    setFormError(null);
    setViewMode('form');
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError('El nombre completo es obligatorio.');
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      await savePerson(
        {
          name: form.name,
          docType: form.docType,
          docNumber: form.docNumber,
          category: form.category,
          role: form.role,
          em: form.em,
          ss: form.ss,
          ca: form.ca,
          pa: form.pa,
          signature: form.signature,
          notes: form.notes,
        },
        form.id
      );
      onNotify(
        form.id
          ? `Datos y firma de ${form.name.trim()} actualizados.`
          : `${form.name.trim()} guardado en el directorio.`
      );
      setViewMode('list');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar en el directorio.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (person: PersonnelRecord) => {
    setBusyId(person.id);
    try {
      await deletePerson(person.id);
      setConfirmDeleteId(null);
      onNotify(`${person.name} eliminado del directorio.`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo eliminar el registro.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSelectPerson = (person: PersonnelRecord) => {
    if (directoryOptions.onSelect) {
      directoryOptions.onSelect(person);
      closeDirectory();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-2 sm:p-4 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Directorio de Personal y Firmas"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-brand-700/40 border border-brand-500/40 flex items-center justify-center shrink-0">
              <Users size={18} className="text-brand-200" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold truncate">
                {directoryOptions.title || 'Directorio de Personal y Firmas'}
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                {isSelectMode
                  ? 'Selecciona una persona para cargarla o cambiarla en el permiso (con su firma guardada)'
                  : 'Guarda, modifica y reutiliza trabajadores, responsables y sus firmas digitales'}
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
              onClick={closeDirectory}
              className="min-h-[38px] min-w-[38px] rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
              aria-label="Cerrar directorio"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Auth Gate */}
        {!user ? (
          <div className="p-6 sm:p-10 flex flex-col items-center justify-center text-center gap-4 overflow-y-auto">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-700">
              <Users size={28} />
            </div>
            <div className="max-w-md">
              <h3 className="text-base font-bold text-slate-900 mb-1.5">
                Conecta tu cuenta para gestionar el directorio de personal
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Inicia sesión con Google para almacenar trabajadores, coordinadores y autorizadores junto con sus cédulas, requisitos y firmas digitales reutilizables.
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
        ) : viewMode === 'form' ? (
          /* Create / Edit Person Form */
          <form onSubmit={handleSaveForm} className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 bg-slate-50">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Volver al listado</span>
              </button>
              <span className="text-xs font-bold text-slate-700">
                {form.id ? 'Modificar Persona y Firma' : 'Nuevo Registro en Directorio'}
              </span>
            </div>

            {formError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre Completo <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={140}
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Ej. Carlos Andrés Mendoza"
                    className="w-full min-h-[40px] border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tipo y Número de Documento
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={form.docType}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, docType: e.target.value as PersonnelDocType }))
                      }
                      className="w-24 min-h-[40px] border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:border-brand-600"
                    >
                      <option value="CC">CC</option>
                      <option value="CE">CE</option>
                      <option value="TI">TI</option>
                      <option value="PAS">PAS</option>
                      <option value="PEP">PEP</option>
                    </select>
                    <input
                      type="text"
                      maxLength={40}
                      value={form.docNumber}
                      onChange={(e) => setForm((f) => ({ ...f, docNumber: e.target.value }))}
                      placeholder="Ej. 1020304050"
                      className="flex-1 min-h-[40px] border border-slate-300 rounded-lg px-3 py-2 text-sm tabular-nums focus:outline-none focus:border-brand-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Categoría / Rol en Permisos
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, category: e.target.value as PersonnelCategory }))
                    }
                    className="w-full min-h-[40px] border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-brand-600"
                  >
                    <option value="worker">Trabajador Autorizado</option>
                    <option value="coordinator">Coordinador de Alturas (SST)</option>
                    <option value="authorizer">Persona que Autoriza el Trabajo</option>
                    <option value="emergencyActivator">Encargado Plan de Emergencias</option>
                    <option value="safetyHelper">Ayudante de Seguridad</option>
                    <option value="general">General / Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cargo / Especialidad
                  </label>
                  <input
                    type="text"
                    maxLength={120}
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    placeholder="Ej. Técnico Liniero / Coordinador SST"
                    className="w-full min-h-[40px] border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Notas / Vigencia de Certificados
                  </label>
                  <input
                    type="text"
                    maxLength={300}
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Ej. Curso avanzado vigente hasta dic 2026"
                    className="w-full min-h-[40px] border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-600"
                  />
                </div>
              </div>

              {/* Compliance Flags */}
              <div>
                <span className="block text-xs font-bold text-slate-700 mb-1.5">
                  Requisitos predefinidos al cargar como Trabajador:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { key: 'em', label: 'EM · Ex. Médico' },
                      { key: 'ss', label: 'SS · Seg. Social' },
                      { key: 'ca', label: 'CA · Cert. Alturas' },
                      { key: 'pa', label: 'PA · Autorizado' },
                    ] as const
                  ).map((item) => {
                    const checked = form[item.key];
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, [item.key]: !f[item.key] }))}
                        className={`min-h-[38px] px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          checked
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                            : 'bg-white border-slate-300 text-slate-600'
                        }`}
                      >
                        <Check size={13} className={checked ? 'opacity-100' : 'opacity-20'} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Signature Pad */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <PenTool size={13} className="text-brand-700" />
                    <span>Firma Digital Guardada</span>
                  </label>
                  {isSignatureFilled(form.signature) ? (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      Firma lista para guardar
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500">Opcional (puedes dibujarla ahora o después)</span>
                  )}
                </div>
                <SignaturePad
                  initialValue={form.signature}
                  onSave={(sig) => setForm((f) => ({ ...f, signature: sig }))}
                  label="Dibuja o actualiza la firma de la persona"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="min-h-[42px] px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="min-h-[42px] px-5 py-2 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={15} />}
                <span>{form.id ? 'Guardar Cambios' : 'Guardar en Directorio'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* List View */
          <>
            <div className="px-3 sm:px-4 py-2.5 bg-white border-b border-slate-200 flex flex-col gap-2 shrink-0">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por nombre, cédula, cargo o nota..."
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

                <button
                  type="button"
                  onClick={openCreateForm}
                  className="min-h-[40px] px-4 py-2 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
                >
                  <UserPlus size={15} />
                  <span>Agregar Personal</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { key: 'all', label: `Todos (${personnel.length})` },
                    { key: 'worker', label: 'Trabajadores' },
                    { key: 'coordinator', label: 'Coordinador SST' },
                    { key: 'authorizer', label: 'Autorizador' },
                    { key: 'emergencyActivator', label: 'Plan Emergencias' },
                    { key: 'safetyHelper', label: 'Ayudantes' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setCategoryFilter(tab.key)}
                    className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      categoryFilter === tab.key
                        ? 'bg-brand-700 text-white border-brand-800'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 bg-slate-50">
              {dataLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                  <Loader2 size={24} className="animate-spin text-brand-600" />
                  <span>Cargando directorio de personal...</span>
                </div>
              ) : filteredPersonnel.length === 0 ? (
                <div className="py-12 text-center bg-white rounded-xl border border-dashed border-slate-300 p-6">
                  <Users size={28} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">
                    {personnel.length === 0
                      ? 'Tu directorio de personal está vacío'
                      : 'No hay coincidencias para esa búsqueda'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 mb-3">
                    {personnel.length === 0
                      ? 'Agrega trabajadores, coordinadores y autorizadores con sus firmas para cargarlos rápidamente en futuros permisos.'
                      : 'Intenta cambiar el filtro de categoría o limpiar el buscador.'}
                  </p>
                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="min-h-[38px] px-4 py-1.5 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus size={14} />
                    <span>Registrar primera persona</span>
                  </button>
                </div>
              ) : (
                filteredPersonnel.map((person) => {
                  const hasSig = isSignatureFilled(person.signature);
                  const isBusy = busyId === person.id;
                  return (
                    <div
                      key={person.id}
                      className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {/* Signature Thumbnail Preview */}
                        <div className="w-24 h-12 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                          {hasSig ? (
                            <img
                              src={person.signature}
                              alt={`Firma de ${person.name}`}
                              className="max-h-10 max-w-full object-contain"
                            />
                          ) : (
                            <span className="text-[10px] text-slate-400 italic text-center leading-tight">
                              Sin firma
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-bold text-slate-900 truncate">
                              {person.name}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-800 border border-brand-200">
                              {CATEGORY_LABELS[person.category] || 'General'}
                            </span>
                          </div>

                          <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                            <span className="font-mono font-semibold text-slate-800">
                              {person.docType || 'CC'} {person.docNumber || 'Sin documento'}
                            </span>
                            {person.role && <span>· {person.role}</span>}
                          </div>

                          <div className="flex flex-wrap items-center gap-1">
                            {(['em', 'ss', 'ca', 'pa'] as const).map((flag) => (
                              <span
                                key={flag}
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded border uppercase ${
                                  person[flag]
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-slate-50 text-slate-400 border-slate-200'
                                }`}
                              >
                                {flag}
                              </span>
                            ))}
                            {person.notes && (
                              <span className="text-[11px] text-slate-500 truncate ml-1">
                                {person.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                        {isSelectMode && (
                          <button
                            type="button"
                            onClick={() => handleSelectPerson(person)}
                            className="min-h-[38px] px-3 py-1.5 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Check size={14} />
                            <span>Usar</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => openEditForm(person)}
                          className="min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 size={14} />
                          <span>Editar</span>
                        </button>

                        {confirmDeleteId === person.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleDelete(person)}
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
                            onClick={() => setConfirmDeleteId(person.id)}
                            className="min-h-[38px] min-w-[38px] px-2 py-1.5 rounded-lg text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 flex items-center justify-center transition-colors cursor-pointer"
                            title="Eliminar del directorio"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
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
