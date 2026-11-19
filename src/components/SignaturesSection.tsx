import React, { useState } from 'react';
import { PermitData, PersonnelCategory, SignatureData, WorkerInfo } from '../types';
import { SignaturePad } from './SignaturePad';
import { TimeSelector } from './DateTimeSelectors';
import { 
  Check, 
  Edit3, 
  X, 
  AlertTriangle, 
  ShieldCheck, 
  Lock, 
  Download, 
  UserCheck, 
  AlertCircle,
  FileCheck2,
  Users,
  BookmarkPlus
} from 'lucide-react';
import { validateSignaturesForPdf, isSignatureFilled } from '../utils/signatureValidation';
import { useCloudSync } from './CloudSyncContext';

interface SignaturesSectionProps {
  data: PermitData;
  updateData: (data: Partial<PermitData>) => void;
  onDownloadPDF?: () => void;
  isGeneratingPdf?: boolean;
}

type RoleType = 'emergencyActivator' | 'authorizer' | 'coordinator';

export function SignaturesSection({ 
  data, 
  updateData, 
  onDownloadPDF, 
  isGeneratingPdf = false 
}: SignaturesSectionProps) {
  const { user, personnel, openDirectory, savePerson } = useCloudSync();
  const [activeModal, setActiveModal] = useState<RoleType | null>(null);
  const [modalData, setModalData] = useState<Partial<SignatureData>>({});
  const [modalError, setModalError] = useState<string | null>(null);
  const [dirFeedback, setDirFeedback] = useState<string | null>(null);
  const [savingDir, setSavingDir] = useState(false);

  // Modal para firma del trabajador directamente desde la sección de firmas
  const [workerModalOpen, setWorkerModalOpen] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [workerModalData, setWorkerModalData] = useState<{ name: string; docNumber: string; signature: string }>({
    name: '',
    docNumber: '',
    signature: ''
  });
  const [workerModalError, setWorkerModalError] = useState<string | null>(null);

  // Alerta informativa si se intenta descargar sin firmas
  const [blockedAlertOpen, setBlockedAlertOpen] = useState(false);

  // Validación de firmas en tiempo real
  const validation = validateSignaturesForPdf(data);
  
  const updateRevalidation = (field: keyof PermitData['revalidation'], value: string) => {
    updateData({
      revalidation: {
        ...data.revalidation,
        [field]: value
      }
    });
  };

  const openModal = (role: RoleType) => {
    setModalData({ ...data[role] });
    setModalError(null);
    setDirFeedback(null);
    setActiveModal(role);
  };

  const saveModal = () => {
    if (!activeModal) return;

    // Validación estricta: para el coordinador SST, el canvas no puede estar vacío
    if (activeModal === 'coordinator' && !isSignatureFilled(modalData.signature)) {
      setModalError('El lienzo de la firma está vacío. Debe realizar el trazo de su firma antes de guardar.');
      return;
    }

    updateData({
      [activeModal]: { ...(data[activeModal] || {}), ...modalData }
    });
    setModalError(null);
    setDirFeedback(null);
    setActiveModal(null);
  };

  const handleLoadRoleFromDirectory = () => {
    if (!activeModal) return;
    const cat: PersonnelCategory = activeModal;
    const hasMatch = personnel.some((p) => p.category === cat);
    openDirectory({
      filterCategory: hasMatch ? cat : 'all',
      title: `Seleccionar ${roleTitles[activeModal]}`,
      onSelect: (person) => {
        setModalData((prev) => ({
          ...prev,
          name: person.name,
          docNumber: person.docNumber || prev.docNumber || '',
          role: person.role || prev.role || '',
          signature: person.signature || prev.signature || '',
        }));
        setModalError(null);
        setDirFeedback(`Cargado: ${person.name}`);
      },
    });
  };

  const handleSaveRoleToDirectory = async () => {
    if (!activeModal) return;
    if (!user) {
      openDirectory({ title: 'Conecta tu cuenta para guardar en el directorio' });
      return;
    }
    if (!modalData.name?.trim()) {
      setModalError('Ingresa el nombre completo antes de guardar en el directorio.');
      return;
    }
    setSavingDir(true);
    try {
      const existingMatch = personnel.find(
        (p) =>
          (modalData.docNumber?.trim() && p.docNumber?.trim() === modalData.docNumber.trim()) ||
          p.name.trim().toLowerCase() === modalData.name!.trim().toLowerCase()
      );
      await savePerson(
        {
          name: modalData.name.trim(),
          docType: existingMatch?.docType || 'CC',
          docNumber: modalData.docNumber || '',
          category: activeModal,
          role:
            modalData.role ||
            existingMatch?.role ||
            (activeModal === 'coordinator'
              ? 'Coordinador SST Alturas'
              : activeModal === 'authorizer'
                ? 'Persona que Autoriza'
                : 'Encargado Plan de Emergencias'),
          em: existingMatch?.em ?? true,
          ss: existingMatch?.ss ?? true,
          ca: existingMatch?.ca ?? true,
          pa: existingMatch?.pa ?? true,
          signature: modalData.signature || '',
          notes: existingMatch?.notes || '',
        },
        existingMatch?.id || null
      );
      setDirFeedback(
        existingMatch
          ? 'Persona y firma actualizadas en el directorio.'
          : 'Persona y firma guardadas en el directorio.'
      );
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Error al guardar en el directorio.');
    } finally {
      setSavingDir(false);
    }
  };

  const openWorkerModal = (workerId?: string) => {
    const workers = data.workers || [];
    let targetWorker: WorkerInfo | undefined;
    
    if (workerId) {
      targetWorker = workers.find(w => w.id === workerId);
    } else {
      // Buscar primero el primer trabajador sin firma o tomar el primer trabajador
      targetWorker = workers.find(w => !isSignatureFilled(w.signature)) || workers[0];
    }

    if (!targetWorker) {
      // Si no existe ningún trabajador registrado, crear uno por defecto
      const newWorker: WorkerInfo = {
        id: Date.now().toString(),
        name: '',
        docType: 'CC',
        docNumber: '',
        em: true,
        ss: true,
        ca: true,
        pa: true,
        signature: '',
        health: { hallucinogens: 'NO', medication: 'NO', epilepsy: 'NO', acrophobia: 'NO', pregnancy: 'NO' }
      };
      updateData({ workers: [newWorker] });
      targetWorker = newWorker;
    }

    setSelectedWorkerId(targetWorker.id);
    setWorkerModalData({
      name: targetWorker.name || '',
      docNumber: targetWorker.docNumber || '',
      signature: targetWorker.signature || ''
    });
    setWorkerModalError(null);
    setDirFeedback(null);
    setWorkerModalOpen(true);
  };

  const saveWorkerModal = () => {
    if (!selectedWorkerId) return;

    if (!isSignatureFilled(workerModalData.signature)) {
      setWorkerModalError('El lienzo de la firma está vacío. El trabajador debe realizar el trazo antes de guardar.');
      return;
    }

    const updatedWorkers = (data.workers || []).map(w => {
      if (w.id === selectedWorkerId) {
        return {
          ...w,
          name: workerModalData.name.trim() || w.name,
          docNumber: workerModalData.docNumber.trim() || w.docNumber,
          signature: workerModalData.signature
        };
      }
      return w;
    });

    updateData({ workers: updatedWorkers });
    setWorkerModalError(null);
    setWorkerModalOpen(false);
  };

  const handleTriggerPdf = () => {
    const status = validateSignaturesForPdf(data);
    if (!status.isValid) {
      setBlockedAlertOpen(true);
      return;
    }
    if (onDownloadPDF) {
      onDownloadPDF();
    }
  };

  const roleTitles = {
    emergencyActivator: 'Persona Encargada de Activar el Plan de Emergencias',
    authorizer: 'Persona que Autoriza el Trabajo (Res. 4272/2021)',
    coordinator: 'Coordinador de Trabajo en Alturas (SST)'
  };

  return (
    <div id="signatures-section" className="border border-black mb-1.5 bg-white shadow-2xs text-[9px] avoid-break">
      
      {/* ========================================================
          PANEL DE VALIDACIÓN LEGAL DE FIRMAS PREVIO A PDF (PRINT:HIDDEN)
          ======================================================== */}
      <div className="bg-slate-900 border-b-2 border-slate-700 p-2.5 sm:p-3 text-slate-100 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-700/80">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-md ${validation.isValid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              {validation.isValid ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm tracking-tight text-white flex items-center gap-2">
                <span>Validación de Firmas Obligatorias SG-SST (Res. 4272/2021)</span>
                {validation.isValid ? (
                  <span className="text-[10px] font-semibold bg-emerald-700/80 text-emerald-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    <Check size={11} /> Listo para PDF
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold bg-red-800/80 text-red-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    <Lock size={11} /> PDF Bloqueado
                  </span>
                )}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Requisito indispensable: Se exige la firma registrada (canvas con trazo válido) tanto del <strong className="text-slate-200">Responsable SST</strong> como del <strong className="text-slate-200">Trabajador</strong> para permitir la descarga del PDF oficial.
              </p>
            </div>
          </div>

          {/* Botón de acción rápida para descargar PDF */}
          <div className="shrink-0 flex items-center gap-2 pt-1 sm:pt-0">
            <button
              type="button"
              onClick={handleTriggerPdf}
              disabled={isGeneratingPdf}
              className={`w-full sm:w-auto px-3.5 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
                validation.isValid
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer ring-1 ring-emerald-400/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 cursor-pointer'
              }`}
              title={validation.isValid ? 'Descargar documento oficial en PDF' : 'Completar firmas obligatorias para habilitar descarga'}
            >
              {validation.isValid ? (
                <>
                  <Download size={14} className={isGeneratingPdf ? 'animate-bounce' : ''} />
                  <span>{isGeneratingPdf ? 'Generando PDF...' : 'Generar PDF (Firmas Validadas)'}</span>
                </>
              ) : (
                <>
                  <Lock size={14} className="text-red-400" />
                  <span>Generar PDF (Requiere 2 Firmas)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tarjetas de estado interactivo para cada firma */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2.5">
          
          {/* Tarjeta 1: Responsable del SST */}
          <div 
            className={`p-2 rounded border flex items-center justify-between gap-2 transition-colors ${
              validation.sstValid 
                ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200' 
                : 'bg-red-950/30 border-red-800/60 text-red-200'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={`p-1.5 rounded shrink-0 ${validation.sstValid ? 'bg-emerald-800/60 text-emerald-300' : 'bg-red-900/60 text-red-300'}`}>
                {validation.sstValid ? <UserCheck size={16} /> : <AlertCircle size={16} />}
              </div>
              <div className="truncate">
                <div className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">1. Responsable SST (Coordinador)</div>
                <div className="text-[11px] font-semibold truncate">
                  {validation.sstValid ? (
                    <span className="text-emerald-300 flex items-center gap-1">
                      <Check size={12} className="shrink-0" />
                      Firma Registrada {data.coordinator.name ? `— ${data.coordinator.name}` : ''}
                    </span>
                  ) : (
                    <span className="text-red-300 font-bold">Firma Pendiente (Lienzo Vacío)</span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => openModal('coordinator')}
              className={`px-2.5 py-1 rounded text-[10px] font-bold shrink-0 transition-colors ${
                validation.sstValid
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600'
                  : 'bg-brand-600 hover:bg-brand-500 text-white shadow-xs'
              }`}
            >
              {validation.sstValid ? 'Editar' : 'Firmar SST'}
            </button>
          </div>

          {/* Tarjeta 2: Persona que Autoriza el Trabajo (Res. 4272/2021) */}
          <div 
            className={`p-2 rounded border flex items-center justify-between gap-2 transition-colors ${
              isSignatureFilled(data.authorizer?.signature)
                ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200' 
                : 'bg-slate-800/70 border-slate-700 text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={`p-1.5 rounded shrink-0 ${isSignatureFilled(data.authorizer?.signature) ? 'bg-emerald-800/60 text-emerald-300' : 'bg-brand-800/60 text-brand-300'}`}>
                {isSignatureFilled(data.authorizer?.signature) ? <UserCheck size={16} /> : <FileCheck2 size={16} />}
              </div>
              <div className="truncate">
                <div className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">2. Persona que Autoriza</div>
                <div className="text-[11px] font-semibold truncate">
                  {isSignatureFilled(data.authorizer?.signature) ? (
                    <span className="text-emerald-300 flex items-center gap-1">
                      <Check size={12} className="shrink-0" />
                      {data.authorizer?.name ? data.authorizer.name : 'Firma Registrada'}
                    </span>
                  ) : (
                    <span className="text-slate-300">
                      {data.authorizer?.name ? `${data.authorizer.name} (Sin firma)` : 'Nombre, cédula y firma'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => openModal('authorizer')}
              className={`px-2.5 py-1 rounded text-[10px] font-bold shrink-0 transition-colors ${
                isSignatureFilled(data.authorizer?.signature)
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600'
                  : 'bg-brand-600 hover:bg-brand-500 text-white shadow-xs'
              }`}
            >
              {isSignatureFilled(data.authorizer?.signature) ? 'Editar' : 'Firmar / Editar'}
            </button>
          </div>

          {/* Tarjeta 3: Trabajador Autorizado */}
          <div 
            className={`p-2 rounded border flex items-center justify-between gap-2 transition-colors ${
              validation.workerValid 
                ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200' 
                : 'bg-red-950/30 border-red-800/60 text-red-200'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={`p-1.5 rounded shrink-0 ${validation.workerValid ? 'bg-emerald-800/60 text-emerald-300' : 'bg-red-900/60 text-red-300'}`}>
                {validation.workerValid ? <UserCheck size={16} /> : <AlertCircle size={16} />}
              </div>
              <div className="truncate">
                <div className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">3. Trabajador Autorizado</div>
                <div className="text-[11px] font-semibold truncate">
                  {validation.workerValid ? (
                    <span className="text-emerald-300 flex items-center gap-1">
                      <Check size={12} className="shrink-0" />
                      Firmados ({validation.signedWorkerCount}/{validation.activeWorkerCount})
                    </span>
                  ) : (
                    <span className="text-red-300 font-bold">Firma Pendiente (Lienzo Vacío)</span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => openWorkerModal()}
              className={`px-2.5 py-1 rounded text-[10px] font-bold shrink-0 transition-colors ${
                validation.workerValid
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600'
                  : 'bg-brand-600 hover:bg-brand-500 text-white shadow-xs'
              }`}
            >
              {validation.workerValid ? 'Editar' : 'Firmar Trabajador'}
            </button>
          </div>

        </div>

        {/* Mensaje de alerta si no está validado */}
        {!validation.isValid && (
          <div className="mt-2 py-1 px-2.5 bg-red-950/50 border border-red-800/70 rounded text-[10px] text-red-200 flex items-center gap-2">
            <AlertTriangle size={13} className="text-red-400 shrink-0" />
            <span>
              <strong>Generación de PDF restringida:</strong> {validation.missingMessages.join(' ')}
            </span>
          </div>
        )}
      </div>

      {/* ========================================================
          MODAL DE ALERTA SI SE INTENTA GENERAR PDF SIN FIRMAS
          ======================================================== */}
      {blockedAlertOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 print:hidden animate-fade-in">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden border border-red-300">
            <div className="bg-red-700 text-white p-3 font-bold flex justify-between items-center">
              <span className="flex items-center gap-2 text-sm sm:text-base">
                <AlertTriangle size={18} /> Requisito de Firmas Obligatorias
              </span>
              <button 
                type="button" 
                onClick={() => setBlockedAlertOpen(false)} 
                className="hover:bg-red-800 p-1 rounded"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 text-slate-800 flex flex-col gap-3">
              <p className="text-xs text-slate-700 leading-relaxed">
                Para garantizar la validez legal del permiso de trabajo en alturas según la <strong>Resolución 4272 de 2021</strong>, no es posible generar ni descargar el archivo PDF hasta que se completen las siguientes firmas obligatorias:
              </p>

              <div className="space-y-2">
                {/* Estado SST */}
                <div className={`p-2.5 rounded border text-xs flex items-center justify-between ${validation.sstValid ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                  <div>
                    <strong>1. Responsable del SST:</strong>
                    <div className="text-[11px]">{validation.sstValid ? '✅ Firma completada' : '❌ Falta firma (lienzo en blanco)'}</div>
                  </div>
                  {!validation.sstValid && (
                    <button
                      type="button"
                      onClick={() => {
                        setBlockedAlertOpen(false);
                        openModal('coordinator');
                      }}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-[11px]"
                    >
                      Firmar Ahora
                    </button>
                  )}
                </div>

                {/* Estado Trabajador */}
                <div className={`p-2.5 rounded border text-xs flex items-center justify-between ${validation.workerValid ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                  <div>
                    <strong>2. Trabajador Autorizado:</strong>
                    <div className="text-[11px]">{validation.workerValid ? '✅ Firma completada' : '❌ Falta firma (lienzo en blanco)'}</div>
                  </div>
                  {!validation.workerValid && (
                    <button
                      type="button"
                      onClick={() => {
                        setBlockedAlertOpen(false);
                        openWorkerModal();
                      }}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-[11px]"
                    >
                      Firmar Ahora
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 p-2 rounded text-[11px] text-slate-600 border border-slate-200">
                ℹ️ Los trazos de la firma se guardan digitalmente y quedarán estampados de forma nítida en el documento oficial.
              </div>
            </div>

            <div className="bg-slate-100 p-3 flex justify-end gap-2 border-t border-slate-200">
              <button 
                type="button" 
                onClick={() => setBlockedAlertOpen(false)} 
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL PARA FIRMAS DE SUPERVISOR / SST / PLAN EMERGENCIA
          ======================================================== */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:hidden animate-fade-in">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
            <div className="bg-brand-800 text-white p-3 font-bold flex justify-between items-center">
              <span className="truncate pr-2">{roleTitles[activeModal]}</span>
              <button type="button" onClick={() => setActiveModal(null)} className="hover:bg-brand-900 p-1 rounded shrink-0">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                <button
                  type="button"
                  onClick={handleLoadRoleFromDirectory}
                  className="px-2.5 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Users size={13} />
                  <span>Cambiar desde Directorio</span>
                </button>
                <button
                  type="button"
                  disabled={savingDir}
                  onClick={handleSaveRoleToDirectory}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <BookmarkPlus size={13} />
                  <span>{savingDir ? 'Guardando...' : 'Guardar en Directorio'}</span>
                </button>
              </div>
              {dirFeedback && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-xs font-medium">
                  {dirFeedback}
                </div>
              )}
              {modalError && (
                <div className="p-2 bg-red-50 border border-red-300 rounded text-red-700 text-xs font-semibold flex items-center gap-1.5">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo</label>
                <input 
                  type="text" 
                  value={modalData.name || ''} 
                  onChange={(e) => {
                    setModalData({ ...modalData, name: e.target.value });
                    setModalError(null);
                  }} 
                  className="w-full border border-slate-300 rounded p-2 text-sm focus:outline-none focus:border-brand-600" 
                  placeholder="Ej. Ing. Laura Gómez"
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Número de Documento / Cédula</label>
                  <input 
                    type="text" 
                    value={modalData.docNumber || ''} 
                    onChange={(e) => {
                      setModalData({ ...modalData, docNumber: e.target.value });
                      setModalError(null);
                    }} 
                    className="w-full border border-slate-300 rounded p-2 text-sm focus:outline-none focus:border-brand-600 tabular-nums" 
                    placeholder="Ej. 1020304050"
                  />
                </div>
                {activeModal !== 'emergencyActivator' && (
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Cargo</label>
                    <input 
                      type="text" 
                      value={modalData.role || (activeModal === 'coordinator' ? 'Coordinador SST Alturas' : '')} 
                      onChange={(e) => {
                        setModalData({ ...modalData, role: e.target.value });
                        setModalError(null);
                      }} 
                      className="w-full border border-slate-300 rounded p-2 text-sm focus:outline-none focus:border-brand-600" 
                      placeholder="Ej. Supervisor de Obra"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Firma Digital{' '}
                  {activeModal === 'coordinator' ? (
                    <span className="text-red-600 font-bold">* (Obligatoria: Canvas no vacío)</span>
                  ) : (
                    <span className="text-slate-500 font-normal">(Dibuje o modifique la firma en el recuadro)</span>
                  )}
                </label>
                <div className="w-full flex justify-center bg-slate-50 border border-slate-200 rounded p-2">
                  <SignaturePad 
                    initialValue={modalData.signature}
                    onSave={(sig) => {
                      setModalData(prev => ({ ...prev, signature: sig }));
                      if (sig && sig.length > 100) {
                        setModalError(null);
                      }
                    }} 
                    label="Dibuje su firma en el recuadro" 
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1 italic">
                  * Utilice el mouse o la pantalla táctil para dibujar su rúbrica. También puede editar el nombre y la cédula directamente en el formato o desde esta ventana.
                </p>
              </div>
            </div>

            <div className="bg-slate-100 p-3 flex justify-end gap-2 border-t border-slate-200">
              <button 
                type="button" 
                onClick={() => setActiveModal(null)} 
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={saveModal} 
                className="px-4 py-2 text-sm font-semibold bg-brand-700 hover:bg-brand-800 text-white rounded flex items-center gap-1 shadow-sm"
              >
                <Check size={16} /> Guardar Firma
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL PARA FIRMA DEL TRABAJADOR AUTORIZADO
          ======================================================== */}
      {workerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:hidden animate-fade-in">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
            <div className="bg-brand-800 text-white p-3 font-bold flex justify-between items-center">
              <span className="flex items-center gap-1.5">
                <UserCheck size={18} /> Firma del Trabajador Autorizado
              </span>
              <button type="button" onClick={() => setWorkerModalOpen(false)} className="hover:bg-brand-900 p-1 rounded shrink-0">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    const hasWorkers = personnel.some((p) => p.category === 'worker');
                    openDirectory({
                      filterCategory: hasWorkers ? 'worker' : 'all',
                      title: 'Cargar Trabajador del Directorio',
                      onSelect: (person) => {
                        setWorkerModalData((prev) => ({
                          name: person.name,
                          docNumber: person.docNumber || prev.docNumber || '',
                          signature: person.signature || prev.signature || '',
                        }));
                        setWorkerModalError(null);
                        setDirFeedback(`Cargado: ${person.name}`);
                      },
                    });
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Users size={13} />
                  <span>Cambiar desde Directorio</span>
                </button>
                <button
                  type="button"
                  disabled={savingDir}
                  onClick={async () => {
                    if (!user) {
                      openDirectory({ title: 'Conecta tu cuenta para guardar en el directorio' });
                      return;
                    }
                    if (!workerModalData.name.trim()) {
                      setWorkerModalError('Ingresa el nombre antes de guardar en el directorio.');
                      return;
                    }
                    setSavingDir(true);
                    try {
                      const existingMatch = personnel.find(
                        (p) =>
                          (workerModalData.docNumber.trim() && p.docNumber?.trim() === workerModalData.docNumber.trim()) ||
                          p.name.trim().toLowerCase() === workerModalData.name.trim().toLowerCase()
                      );
                      await savePerson(
                        {
                          name: workerModalData.name.trim(),
                          docType: existingMatch?.docType || 'CC',
                          docNumber: workerModalData.docNumber.trim(),
                          category: 'worker',
                          role: existingMatch?.role || 'Trabajador Autorizado',
                          em: existingMatch?.em ?? true,
                          ss: existingMatch?.ss ?? true,
                          ca: existingMatch?.ca ?? true,
                          pa: existingMatch?.pa ?? true,
                          signature: workerModalData.signature || '',
                          notes: existingMatch?.notes || '',
                        },
                        existingMatch?.id || null
                      );
                      setDirFeedback('Trabajador y firma guardados en el directorio.');
                    } catch (err) {
                      setWorkerModalError(err instanceof Error ? err.message : 'Error al guardar.');
                    } finally {
                      setSavingDir(false);
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <BookmarkPlus size={13} />
                  <span>{savingDir ? 'Guardando...' : 'Guardar en Directorio'}</span>
                </button>
              </div>
              {dirFeedback && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-xs font-medium">
                  {dirFeedback}
                </div>
              )}
              {workerModalError && (
                <div className="p-2 bg-red-50 border border-red-300 rounded text-red-700 text-xs font-semibold flex items-center gap-1.5">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{workerModalError}</span>
                </div>
              )}

              {/* Selector si hay múltiples trabajadores */}
              {(data.workers || []).length > 1 && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Seleccionar Trabajador</label>
                  <select
                    value={selectedWorkerId}
                    onChange={(e) => {
                      const selId = e.target.value;
                      setSelectedWorkerId(selId);
                      const target = data.workers.find(w => w.id === selId);
                      if (target) {
                        setWorkerModalData({
                          name: target.name || '',
                          docNumber: target.docNumber || '',
                          signature: target.signature || ''
                        });
                        setWorkerModalError(null);
                      }
                    }}
                    className="w-full border border-slate-300 rounded p-2 text-sm focus:outline-none focus:border-brand-600 bg-white"
                  >
                    {data.workers.map((w, idx) => (
                      <option key={w.id} value={w.id}>
                        {idx + 1}. {w.name || 'Sin nombre registrado'} {isSignatureFilled(w.signature) ? '(Firmado ✓)' : '(Pendiente)'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo del Trabajador</label>
                <input 
                  type="text" 
                  value={workerModalData.name} 
                  onChange={(e) => {
                    setWorkerModalData({ ...workerModalData, name: e.target.value });
                    setWorkerModalError(null);
                  }} 
                  className="w-full border border-slate-300 rounded p-2 text-sm focus:outline-none focus:border-brand-600" 
                  placeholder="Ej. Carlos Mendoza Gómez"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Número de Documento / Cédula</label>
                <input 
                  type="text" 
                  value={workerModalData.docNumber} 
                  onChange={(e) => {
                    setWorkerModalData({ ...workerModalData, docNumber: e.target.value });
                    setWorkerModalError(null);
                  }} 
                  className="w-full border border-slate-300 rounded p-2 text-sm focus:outline-none focus:border-brand-600 tabular-nums" 
                  placeholder="Ej. 1020304050"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Firma Digital del Trabajador <span className="text-red-600 font-bold">* (Obligatoria: Canvas no vacío)</span>
                </label>
                <div className="w-full flex justify-center bg-slate-50 border border-slate-200 rounded p-2">
                  <SignaturePad 
                    initialValue={workerModalData.signature}
                    onSave={(sig) => {
                      setWorkerModalData(prev => ({ ...prev, signature: sig }));
                      if (sig && sig.length > 100) {
                        setWorkerModalError(null);
                      }
                    }} 
                    label="Dibuje la firma del trabajador" 
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1 italic">
                  * El trabajador debe firmar dando constancia de que conoce y acata las medidas de seguridad del permiso.
                </p>
              </div>
            </div>

            <div className="bg-slate-100 p-3 flex justify-end gap-2 border-t border-slate-200">
              <button 
                type="button" 
                onClick={() => setWorkerModalOpen(false)} 
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={saveWorkerModal} 
                className="px-4 py-2 text-sm font-semibold bg-brand-700 hover:bg-brand-800 text-white rounded flex items-center gap-1 shadow-sm"
              >
                <Check size={16} /> Guardar Firma de Trabajador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          DOCUMENTO OFICIAL: SECCIÓN VI - FIRMAS DE AUTORIZACIÓN
          ======================================================== */}
      <div className="bg-brand-700 text-white font-bold py-1.5 px-2 text-[11px] uppercase tracking-wider text-center relative border-b border-black flex items-center justify-center leading-snug">
        <span>VI. FIRMAS DE AUTORIZACIÓN Y PLAN DE EMERGENCIA</span>
      </div>

      {/* Contenedor de 3 columnas de firma simétricas (Plan Emergencia, Persona que Autoriza, Coordinador SST) */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-black border-b border-black avoid-break">

        {/* Columna 1: Encargado del Plan de Emergencia */}
        <div
          className="flex flex-col bg-white cursor-pointer hover:bg-slate-50/80 transition-colors"
          onClick={() => openModal('emergencyActivator')}
          title="Click para firmar o editar"
        >
          <div className="bg-brand-100/90 font-bold py-1 px-1.5 text-center border-b border-black text-black uppercase text-[8.5px] min-h-[24px] flex items-center justify-center font-black leading-snug">
            1. Encargado Plan de Emergencias
          </div>

          {/* Espacio reservado para firma con línea de base clara */}
          <div className="px-2 py-1 flex items-center justify-center min-h-[56px] bg-white border-b border-black">
            {data.emergencyActivator.signature ? (
              <img
                src={data.emergencyActivator.signature}
                alt="Firma Emergencia"
                style={{ maxHeight: '46px', maxWidth: '150px', objectFit: 'contain', display: 'block', margin: '0 auto' }}
              />
            ) : (
              <div className="w-full flex items-center justify-center text-slate-400 italic text-[8.5px] print:hidden">
                <Edit3 size={11} className="mr-1 text-brand-700" /> Click para firmar
              </div>
            )}
          </div>
          <div className="text-center text-[8px] text-slate-700 font-bold py-0.5 border-b border-black bg-brand-50/60 uppercase tracking-tight leading-snug">
            Línea de Firma y Validación
          </div>

          {/* Nombre y Cédula */}
          <div className="flex border-b border-black min-h-[24px] items-stretch text-[9px]">
            <span className="w-16 px-1.5 py-0.5 font-bold border-r border-black bg-brand-50 text-black flex items-center justify-center text-center shrink-0">
              Nombre:
            </span>
            <div className="relative flex-1 min-w-0 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={data.emergencyActivator?.name || ''}
                onChange={(e) => updateData({ emergencyActivator: { ...(data.emergencyActivator || { name: '', docNumber: '', signature: '' }), name: e.target.value } })}
                aria-label="Nombre Encargado Plan de Emergencias"
                className="w-full py-0.5 px-1.5 font-semibold text-black text-center bg-transparent outline-none leading-snug"
              />
              {!data.emergencyActivator?.name && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-slate-400 italic font-normal print:hidden">---</span>
              )}
            </div>
          </div>
          <div className="flex min-h-[24px] items-stretch text-[9px]">
            <span className="w-16 px-1.5 py-0.5 font-bold border-r border-black bg-brand-50 text-black flex items-center justify-center text-center shrink-0">
              Cédula:
            </span>
            <div className="relative flex-1 min-w-0 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={data.emergencyActivator?.docNumber || ''}
                onChange={(e) => updateData({ emergencyActivator: { ...(data.emergencyActivator || { name: '', docNumber: '', signature: '' }), docNumber: e.target.value } })}
                aria-label="Cédula Encargado Plan de Emergencias"
                className="w-full py-0.5 px-1.5 tabular-nums font-bold text-black text-center bg-transparent outline-none leading-snug"
              />
              {!data.emergencyActivator?.docNumber && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-slate-400 italic font-normal print:hidden">---</span>
              )}
            </div>
          </div>
        </div>

        {/* Columna 2: Persona que Autoriza el Trabajo (Res. 4272/2021) */}
        <div
          className="flex flex-col bg-white cursor-pointer hover:bg-slate-50/80 transition-colors"
          onClick={() => openModal('authorizer')}
          title="Click para firmar o editar"
        >
          <div className="bg-brand-100/90 font-bold py-1 px-1.5 text-center border-b border-black text-black uppercase text-[8.5px] min-h-[24px] flex items-center justify-center font-black leading-snug">
            2. Persona que Autoriza el Trabajo
          </div>

          {/* Espacio reservado para firma con línea de base clara */}
          <div className="px-2 py-1 flex items-center justify-center min-h-[56px] bg-white border-b border-black relative">
            {data.authorizer?.signature ? (
              <img
                src={data.authorizer.signature}
                alt="Firma Persona que Autoriza"
                style={{ maxHeight: '46px', maxWidth: '150px', objectFit: 'contain', display: 'block', margin: '0 auto' }}
              />
            ) : (
              <div className="w-full flex items-center justify-center text-brand-700 italic text-[8.5px] font-semibold print:hidden">
                <Edit3 size={11} className="mr-1 text-brand-700" /> Click para firmar (Res. 4272)
              </div>
            )}
          </div>
          <div className="text-center text-[8px] text-slate-700 font-bold py-0.5 border-b border-black bg-brand-50/60 uppercase tracking-tight leading-snug">
            Línea de Firma y Autorización
          </div>

          {/* Nombre y Cédula editables */}
          <div className="flex border-b border-black min-h-[24px] items-stretch text-[9px]">
            <span className="w-16 px-1.5 py-0.5 font-bold border-r border-black bg-brand-50 text-black flex items-center justify-center text-center shrink-0">
              Nombre:
            </span>
            <div className="relative flex-1 min-w-0 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={data.authorizer?.name || ''}
                onChange={(e) => updateData({ authorizer: { ...(data.authorizer || { name: '', docNumber: '', role: '', signature: '' }), name: e.target.value } })}
                aria-label="Nombre Persona que Autoriza el Trabajo"
                className="w-full py-0.5 px-1.5 font-semibold text-black text-center bg-transparent outline-none leading-snug"
              />
              {!data.authorizer?.name && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-slate-400 italic font-normal print:hidden">---</span>
              )}
            </div>
          </div>
          <div className="flex min-h-[24px] items-stretch text-[9px]">
            <span className="w-16 px-1.5 py-0.5 font-bold border-r border-black bg-brand-50 text-black flex items-center justify-center text-center shrink-0">
              Cédula:
            </span>
            <div className="relative flex-1 min-w-0 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={data.authorizer?.docNumber || ''}
                onChange={(e) => updateData({ authorizer: { ...(data.authorizer || { name: '', docNumber: '', role: '', signature: '' }), docNumber: e.target.value } })}
                aria-label="Cédula Persona que Autoriza el Trabajo"
                className="w-full py-0.5 px-1.5 tabular-nums font-bold text-black text-center bg-transparent outline-none leading-snug"
              />
              {!data.authorizer?.docNumber && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-slate-400 italic font-normal print:hidden">---</span>
              )}
            </div>
          </div>
        </div>

        {/* Columna 3: Coordinador de Trabajo en Alturas (SST) */}
        <div
          className={`flex flex-col bg-white cursor-pointer hover:bg-slate-50/80 transition-colors ${
            !validation.sstValid ? 'ring-1 ring-red-300 bg-red-50/20' : ''
          }`}
          onClick={() => openModal('coordinator')}
          title="Click para firmar o editar"
        >
          <div className="bg-brand-100/90 font-bold py-1 px-1.5 text-center border-b border-black text-black uppercase text-[8.5px] min-h-[24px] flex items-center justify-center font-black leading-snug">
            3. Coordinador de Trabajo en Alturas (SST)
          </div>

          {/* Espacio reservado para firma con línea de base clara */}
          <div className="px-2 py-1 flex items-center justify-center min-h-[56px] bg-white border-b border-black relative">
            {data.coordinator.signature ? (
              <img
                src={data.coordinator.signature}
                alt="Firma Coordinador"
                style={{ maxHeight: '46px', maxWidth: '150px', objectFit: 'contain', display: 'block', margin: '0 auto' }}
              />
            ) : (
              <div className="w-full flex items-center justify-center text-red-700 italic text-[8.5px] font-semibold print:hidden">
                <Edit3 size={11} className="mr-1 text-red-600" /> Firma SST Requerida (Click para firmar)
              </div>
            )}
          </div>
          <div className="text-center text-[8px] text-slate-700 font-bold py-0.5 border-b border-black bg-brand-50/60 uppercase tracking-tight leading-snug">
            Línea de Firma y Autorización
          </div>

          {/* Nombre y Cédula */}
          <div className="flex border-b border-black min-h-[24px] items-stretch text-[9px]">
            <span className="w-16 px-1.5 py-0.5 font-bold border-r border-black bg-brand-50 text-black flex items-center justify-center text-center shrink-0">
              Nombre:
            </span>
            <div className="relative flex-1 min-w-0 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={data.coordinator?.name || ''}
                onChange={(e) => updateData({ coordinator: { ...(data.coordinator || { name: '', docNumber: '', signature: '' }), name: e.target.value } })}
                aria-label="Nombre Coordinador SST"
                className="w-full py-0.5 px-1.5 font-semibold text-black text-center bg-transparent outline-none leading-snug"
              />
              {!data.coordinator?.name && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-slate-400 italic font-normal print:hidden">---</span>
              )}
            </div>
          </div>
          <div className="flex min-h-[24px] items-stretch text-[9px]">
            <span className="w-16 px-1.5 py-0.5 font-bold border-r border-black bg-brand-50 text-black flex items-center justify-center text-center shrink-0">
              Cédula:
            </span>
            <div className="relative flex-1 min-w-0 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={data.coordinator?.docNumber || ''}
                onChange={(e) => updateData({ coordinator: { ...(data.coordinator || { name: '', docNumber: '', signature: '' }), docNumber: e.target.value } })}
                aria-label="Cédula Coordinador SST"
                className="w-full py-0.5 px-1.5 tabular-nums font-bold text-black text-center bg-transparent outline-none leading-snug"
              />
              {!data.coordinator?.docNumber && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-slate-400 italic font-normal print:hidden">---</span>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Sección VII: Revalidación y Control de Suspensión / Cancelación */}
      <div className="flex flex-col bg-white avoid-break">
        <div className="bg-brand-700 text-white font-bold py-1.5 px-2 text-center border-b border-black uppercase tracking-wider text-[10px] relative flex items-center justify-center leading-snug">
          <span>VII. REVALIDACIÓN Y CONTROL DE SUSPENSIÓN / CANCELACIÓN</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-black text-[9px]">

          {/* Suspensión Temporal */}
          <div className="flex flex-col">
            <div className="flex flex-row border-b border-black bg-brand-50/40 min-h-[24px] items-stretch">
              <span className="w-24 px-1.5 py-0.5 font-bold border-r border-black bg-brand-100/90 text-black flex items-center justify-center text-center shrink-0">
                Suspensión:
              </span>
              <div className="flex-1 flex items-center justify-center px-1.5 py-0.5 border-r border-black">
                <span className="font-semibold text-slate-800 mr-1 shrink-0">Hora Inicio:</span>
                <TimeSelector
                  value={data.revalidation.suspensionTime}
                  onChange={(val) => updateRevalidation('suspensionTime', val)}
                  ariaLabel="Hora Inicio Suspensión"
                  className="min-w-[60px] px-1 py-0.5 font-bold text-black"
                />
              </div>
              <div className="flex-1 flex items-center justify-center px-1.5 py-0.5">
                <span className="font-semibold text-slate-800 mr-1 shrink-0">Reanuda:</span>
                <TimeSelector
                  value={data.revalidation.resumeTime}
                  onChange={(val) => updateRevalidation('resumeTime', val)}
                  ariaLabel="Hora de Reanudación"
                  className="min-w-[60px] px-1 py-0.5 font-bold text-black"
                />
              </div>
            </div>
            <div className="flex flex-row items-stretch min-h-[24px]">
              <span className="w-24 px-1.5 py-0.5 font-semibold border-r border-black bg-slate-50 text-black flex items-center justify-center text-center shrink-0">
                Motivo:
              </span>
              <input
                type="text"
                value={data.revalidation.suspensionReason}
                onChange={e => updateRevalidation('suspensionReason', e.target.value)}
                className="flex-1 px-2 py-0.5 outline-none bg-transparent placeholder-slate-400 text-black text-center font-medium leading-snug"
                placeholder="Ej. Lluvia, viento > 30 km/h o tormenta eléctrica..."
              />
            </div>
          </div>

          {/* Cancelación Definitiva */}
          <div className="flex flex-col">
            <div className="flex flex-row border-b border-black bg-brand-50/40 min-h-[24px] items-stretch">
              <span className="w-24 px-1.5 py-0.5 font-bold border-r border-black bg-brand-100/90 text-black flex items-center justify-center text-center shrink-0">
                Cancelación:
              </span>
              <div className="flex-1 flex items-center justify-center px-1.5 py-0.5">
                <span className="font-semibold text-slate-800 mr-1 shrink-0">Hora Cierre:</span>
                <TimeSelector
                  value={data.revalidation.cancelTime}
                  onChange={(val) => updateRevalidation('cancelTime', val)}
                  ariaLabel="Hora Cierre por Cancelación"
                  className="min-w-[60px] px-1 py-0.5 font-bold text-black"
                />
              </div>
            </div>
            <div className="flex flex-row items-stretch min-h-[24px]">
              <span className="w-24 px-1.5 py-0.5 font-semibold border-r border-black bg-slate-50 text-black flex items-center justify-center text-center shrink-0">
                Motivo:
              </span>
              <input
                type="text"
                value={data.revalidation.cancelReason}
                onChange={e => updateRevalidation('cancelReason', e.target.value)}
                className="flex-1 px-2 py-0.5 outline-none bg-transparent placeholder-slate-400 text-black text-center font-medium leading-snug"
                placeholder="Incumplimiento de SST, emergencia en planta, etc."
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
