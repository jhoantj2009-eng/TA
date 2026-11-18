import React, { useState } from 'react';
import { Plus, Trash2, Check, X, Users, BookmarkPlus } from 'lucide-react';
import { PermitData, PersonnelRecord, WorkerInfo } from '../types';
import { SignaturePad } from './SignaturePad';
import { useCloudSync } from './CloudSyncContext';

interface WorkersSectionProps {
  data: PermitData;
  updateData: (data: Partial<PermitData>) => void;
}

export function WorkersSection({ data, updateData }: WorkersSectionProps) {
  const { user, personnel, openDirectory, savePerson } = useCloudSync();
  const [activeWorkerModal, setActiveWorkerModal] = useState<string | null>(null);
  const [modalData, setModalData] = useState<Partial<WorkerInfo>>({});
  const [directoryFeedback, setDirectoryFeedback] = useState<string | null>(null);
  const [savingToDir, setSavingToDir] = useState(false);
  const [activeHelperModal, setActiveHelperModal] = useState(false);
  const [helperModalData, setHelperModalData] = useState({ name: '', signature: '' });

  const handleAddWorker = () => {
    updateData({
      workers: [
        ...data.workers,
        { 
          id: Date.now().toString(), 
          name: '', 
          docType: 'CC', 
          docNumber: '', 
          em: false, 
          ss: false, 
          ca: false, 
          pa: false, 
          signature: '', 
          health: { hallucinogens: '', medication: '', epilepsy: '', acrophobia: '', pregnancy: '' } 
        }
      ]
    });
  };

  const handleRemoveWorker = (id: string) => {
    if (data.workers.length > 1) {
      updateData({ workers: data.workers.filter(w => w.id !== id) });
    }
  };

  const handleWorkerChange = (id: string, field: keyof WorkerInfo, value: any) => {
    updateData({
      workers: data.workers.map(w => w.id === id ? { ...w, [field]: value } : w)
    });
  };

  const handleHelperChange = (field: string, value: string) => {
    updateData({ safetyHelper: { ...data.safetyHelper, [field]: value } });
  };

  const openWorkerModal = (worker: WorkerInfo) => {
    setModalData({ 
      name: worker.name, 
      docType: worker.docType || 'CC', 
      docNumber: worker.docNumber, 
      em: worker.em,
      ss: worker.ss,
      ca: worker.ca,
      pa: worker.pa,
      signature: worker.signature 
    });
    setDirectoryFeedback(null);
    setActiveWorkerModal(worker.id);
  };

  const saveWorkerModal = () => {
    if (activeWorkerModal) {
      updateData({
        workers: data.workers.map(w => w.id === activeWorkerModal ? { ...w, ...modalData } : w)
      });
      setActiveWorkerModal(null);
    }
  };

  const handleAddWorkerFromDirectory = () => {
    const hasWorkersInDir = personnel.some((p) => p.category === 'worker');
    openDirectory({
      filterCategory: hasWorkersInDir ? 'worker' : 'all',
      title: 'Seleccionar Trabajador del Directorio',
      onSelect: (person: PersonnelRecord) => {
        const emptyIdx = data.workers.findIndex(
          (w) => !w.name?.trim() && !w.docNumber?.trim()
        );
        const mappedWorker: WorkerInfo = {
          id: emptyIdx >= 0 ? data.workers[emptyIdx].id : Date.now().toString(),
          name: person.name,
          docType: person.docType || 'CC',
          docNumber: person.docNumber || '',
          em: Boolean(person.em),
          ss: Boolean(person.ss),
          ca: Boolean(person.ca),
          pa: Boolean(person.pa),
          signature: person.signature || '',
          health: emptyIdx >= 0
            ? data.workers[emptyIdx].health
            : { hallucinogens: '', medication: '', epilepsy: '', acrophobia: '', pregnancy: '' },
        };
        if (emptyIdx >= 0) {
          updateData({
            workers: data.workers.map((w, idx) => (idx === emptyIdx ? mappedWorker : w)),
          });
        } else {
          updateData({ workers: [...data.workers, mappedWorker] });
        }
      },
    });
  };

  const handlePickForCurrentWorkerModal = () => {
    const hasWorkersInDir = personnel.some((p) => p.category === 'worker');
    openDirectory({
      filterCategory: hasWorkersInDir ? 'worker' : 'all',
      title: 'Cambiar Trabajador desde el Directorio',
      onSelect: (person: PersonnelRecord) => {
        setModalData((prev) => ({
          ...prev,
          name: person.name,
          docType: person.docType || 'CC',
          docNumber: person.docNumber || '',
          em: Boolean(person.em),
          ss: Boolean(person.ss),
          ca: Boolean(person.ca),
          pa: Boolean(person.pa),
          signature: person.signature || prev.signature || '',
        }));
        setDirectoryFeedback(`Cargado: ${person.name}`);
      },
    });
  };

  const handleSaveWorkerToDirectory = async () => {
    if (!user) {
      openDirectory({ title: 'Conecta tu cuenta para guardar en el directorio' });
      return;
    }
    if (!modalData.name?.trim()) {
      setDirectoryFeedback('Escribe el nombre completo antes de guardar en el directorio.');
      return;
    }
    setSavingToDir(true);
    try {
      const existingMatch = personnel.find(
        (p) =>
          (modalData.docNumber?.trim() && p.docNumber?.trim() === modalData.docNumber.trim()) ||
          p.name.trim().toLowerCase() === modalData.name!.trim().toLowerCase()
      );
      await savePerson(
        {
          name: modalData.name.trim(),
          docType: modalData.docType || 'CC',
          docNumber: modalData.docNumber || '',
          category: 'worker',
          role: existingMatch?.role || 'Trabajador Autorizado',
          em: modalData.em ?? true,
          ss: modalData.ss ?? true,
          ca: modalData.ca ?? true,
          pa: modalData.pa ?? true,
          signature: modalData.signature || '',
          notes: existingMatch?.notes || '',
        },
        existingMatch?.id || null
      );
      setDirectoryFeedback(
        existingMatch
          ? 'Trabajador y firma actualizados en el directorio.'
          : 'Trabajador y firma guardados en el directorio.'
      );
    } catch (err) {
      setDirectoryFeedback(err instanceof Error ? err.message : 'Error al guardar en directorio.');
    } finally {
      setSavingToDir(false);
    }
  };

  const openHelperModal = () => {
    if (data.safetyHelper.required !== 'N.A') {
      setHelperModalData({ name: data.safetyHelper.name, signature: data.safetyHelper.signature });
      setDirectoryFeedback(null);
      setActiveHelperModal(true);
    }
  };

  const saveHelperModal = () => {
    updateData({
      safetyHelper: { ...data.safetyHelper, ...helperModalData }
    });
    setActiveHelperModal(false);
  };

  // Garantizamos exactamente 6 filas fijas para distribución uniforme y cumplimiento estricto
  const fixedRowCount = Math.max(6, data.workers.length);
  const rows = Array.from({ length: fixedRowCount }, (_, i) => data.workers[i] || null);

  return (
    <div className="border border-slate-700 mb-2 bg-white shadow-2xs">
      {/* Helper Modal */}
      {activeHelperModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:hidden">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
            <div className="bg-brand-800 text-white p-3 font-bold flex justify-between items-center">
              <span>Datos del Ayudante de Seguridad</span>
              <button type="button" onClick={() => setActiveHelperModal(false)} className="hover:bg-brand-900 p-1 rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    const hasHelpers = personnel.some((p) => p.category === 'safetyHelper');
                    openDirectory({
                      filterCategory: hasHelpers ? 'safetyHelper' : 'all',
                      title: 'Elegir Ayudante del Directorio',
                      onSelect: (person) => {
                        setHelperModalData((prev) => ({
                          name: person.name,
                          signature: person.signature || prev.signature || '',
                        }));
                        setDirectoryFeedback(`Cargado: ${person.name}`);
                      },
                    });
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Users size={13} />
                  <span>Cargar / Cambiar del Directorio</span>
                </button>
                <button
                  type="button"
                  disabled={savingToDir}
                  onClick={async () => {
                    if (!user) {
                      openDirectory({ title: 'Conecta tu cuenta para guardar en el directorio' });
                      return;
                    }
                    if (!helperModalData.name?.trim()) {
                      setDirectoryFeedback('Ingresa el nombre antes de guardar en el directorio.');
                      return;
                    }
                    setSavingToDir(true);
                    try {
                      const existingMatch = personnel.find(
                        (p) => p.name.trim().toLowerCase() === helperModalData.name.trim().toLowerCase()
                      );
                      await savePerson(
                        {
                          name: helperModalData.name.trim(),
                          docType: existingMatch?.docType || 'CC',
                          docNumber: existingMatch?.docNumber || '',
                          category: 'safetyHelper',
                          role: existingMatch?.role || 'Ayudante de Seguridad',
                          em: existingMatch?.em ?? true,
                          ss: existingMatch?.ss ?? true,
                          ca: existingMatch?.ca ?? true,
                          pa: existingMatch?.pa ?? true,
                          signature: helperModalData.signature || '',
                          notes: existingMatch?.notes || '',
                        },
                        existingMatch?.id || null
                      );
                      setDirectoryFeedback('Ayudante y firma guardados en el directorio.');
                    } finally {
                      setSavingToDir(false);
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <BookmarkPlus size={13} />
                  <span>Guardar en Directorio</span>
                </button>
              </div>
              {directoryFeedback && (
                <div className="px-2.5 py-1.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                  {directoryFeedback}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo</label>
                <input 
                  type="text" 
                  value={helperModalData.name || ''} 
                  onChange={(e) => setHelperModalData({ ...helperModalData, name: e.target.value })} 
                  className="w-full border border-slate-300 rounded p-2 text-sm focus:outline-none focus:border-brand-600" 
                  placeholder="Ej. Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Firma del Ayudante</label>
                <div className="w-full flex justify-center bg-gray-50 border border-gray-200 rounded p-2">
                  <SignaturePad 
                    initialValue={helperModalData.signature}
                    onSave={(sig) => setHelperModalData({ ...helperModalData, signature: sig })} 
                    label="Dibuje su firma aquí" 
                  />
                </div>
              </div>
            </div>
            <div className="bg-gray-100 p-3 flex justify-end gap-2 border-t border-gray-200">
              <button type="button" onClick={() => setActiveHelperModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded">
                Cancelar
              </button>
              <button type="button" onClick={saveHelperModal} className="px-4 py-2 text-sm font-semibold bg-brand-700 hover:bg-brand-800 text-white rounded flex items-center gap-1 shadow-sm">
                <Check size={16} /> Guardar Datos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Worker Modal */}
      {activeWorkerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:hidden">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
            <div className="bg-brand-800 text-white p-3 font-bold flex justify-between items-center">
              <span>Datos del Trabajador Autorizado</span>
              <button type="button" onClick={() => setActiveWorkerModal(null)} className="hover:bg-brand-900 p-1 rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                <button
                  type="button"
                  onClick={handlePickForCurrentWorkerModal}
                  className="px-2.5 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Users size={13} />
                  <span>Cambiar desde Directorio</span>
                </button>
                <button
                  type="button"
                  disabled={savingToDir}
                  onClick={handleSaveWorkerToDirectory}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <BookmarkPlus size={13} />
                  <span>{savingToDir ? 'Guardando...' : 'Guardar en Directorio'}</span>
                </button>
              </div>
              {directoryFeedback && (
                <div className="px-2.5 py-1.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                  {directoryFeedback}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo</label>
                <input 
                  type="text" 
                  value={modalData.name || ''} 
                  onChange={(e) => setModalData({ ...modalData, name: e.target.value })} 
                  className="w-full border border-slate-300 rounded p-2 text-sm focus:outline-none focus:border-brand-600" 
                  placeholder="Ej. Carlos Mendoza Gómez"
                />
              </div>
              <div className="flex gap-2">
                <div className="w-1/3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tipo Doc.</label>
                  <select
                    value={modalData.docType || 'CC'}
                    onChange={(e) => setModalData({ ...modalData, docType: e.target.value })}
                    className="w-full border border-slate-300 rounded p-2 text-sm focus:outline-none focus:border-brand-600 bg-white"
                  >
                    <option value="CC">CC</option>
                    <option value="CE">CE</option>
                    <option value="TI">TI</option>
                    <option value="PAS">PAS</option>
                    <option value="PEP">PEP</option>
                  </select>
                </div>
                <div className="w-2/3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Número de Documento</label>
                  <input 
                    type="text" 
                    value={modalData.docNumber || ''} 
                    onChange={(e) => setModalData({ ...modalData, docNumber: e.target.value })} 
                    className="w-full border border-slate-300 rounded p-2 text-sm focus:outline-none focus:border-brand-600 tabular-nums" 
                    placeholder="1020304050"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Firma del Trabajador</label>
                <div className="w-full flex justify-center bg-gray-50 border border-gray-200 rounded p-2">
                  <SignaturePad 
                    initialValue={modalData.signature}
                    onSave={(sig) => setModalData({ ...modalData, signature: sig })} 
                    label="Dibuje la firma del trabajador" 
                  />
                </div>
              </div>
            </div>
            <div className="bg-gray-100 p-3 flex justify-end gap-2 border-t border-gray-200">
              <button type="button" onClick={() => setActiveWorkerModal(null)} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded">
                Cancelar
              </button>
              <button type="button" onClick={saveWorkerModal} className="px-4 py-2 text-sm font-semibold bg-brand-700 hover:bg-brand-800 text-white rounded flex items-center gap-1 shadow-sm">
                <Check size={16} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Encabezado Sección estrictamente centrado */}
      <div className="bg-brand-700 text-white font-bold py-1 px-2 text-[10.5px] sm:text-xs uppercase tracking-wider text-center relative border-b border-slate-700 flex items-center justify-center">
        <span>II. REGISTRO DE TRABAJADORES AUTORIZADOS</span>
      </div>

      {/* Tabla con anchos porcentuales estrictos y scroll horizontal en móviles */}
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse min-w-[560px] md:min-w-0" style={{ tableLayout: 'fixed', borderSpacing: 0 }}>
          <thead>
            <tr className="bg-brand-100/90 text-brand-950 text-center font-bold text-[9px] sm:text-[9.5px]">
              <th className="border border-slate-700 p-1 text-center align-middle" style={{ width: '5%' }}>No.</th>
              <th className="border border-slate-700 p-1 text-center align-middle" style={{ width: '35%' }}>Nombre Completo</th>
              <th className="border border-slate-700 p-1 text-center align-middle" style={{ width: '8%' }}>Tipo Doc</th>
              <th className="border border-slate-700 p-1 text-center align-middle" style={{ width: '18%' }}>No. Documento</th>
              <th className="border border-slate-700 p-1 text-center align-middle" style={{ width: '3.5%' }} title="Examen Médico Ocupacional">EM</th>
              <th className="border border-slate-700 p-1 text-center align-middle" style={{ width: '3.5%' }} title="Seguridad Social Vigente">SS</th>
              <th className="border border-slate-700 p-1 text-center align-middle" style={{ width: '3.5%' }} title="Certificado de Alturas Vigente">CA</th>
              <th className="border border-slate-700 p-1 text-center align-middle" style={{ width: '3.5%' }} title="Persona Autorizada">PA</th>
              <th className="border border-slate-700 p-1 text-center align-middle" style={{ width: '20%' }}>Firma del Trabajador</th>
            </tr>
          </thead>
          <tbody className="text-[9px] sm:text-[9.5px]">
            {rows.map((worker, index) => {
              if (!worker) {
                // Fila vacía para mantener exactamente la cuadrícula de 6 filas
                return (
                  <tr key={`empty-w-${index}`} className="h-[28px]">
                    <td className="border border-slate-700 p-1 text-center font-bold bg-slate-50 text-slate-400">{index + 1}</td>
                    <td className="border border-slate-700 p-1 pl-1 text-slate-300 italic font-light">&nbsp;</td>
                    <td className="border border-slate-700 p-1 text-center text-slate-300">&nbsp;</td>
                    <td className="border border-slate-700 p-1 text-center text-slate-300">&nbsp;</td>
                    <td className="border border-slate-700 p-1 text-center bg-white">&nbsp;</td>
                    <td className="border border-slate-700 p-1 text-center bg-white">&nbsp;</td>
                    <td className="border border-slate-700 p-1 text-center bg-white">&nbsp;</td>
                    <td className="border border-slate-700 p-1 text-center bg-white">&nbsp;</td>
                    <td className="border border-slate-700 p-1 text-center bg-white">&nbsp;</td>
                  </tr>
                );
              }

              return (
                <tr key={worker.id} className="h-[28px] hover:bg-slate-50/70 transition-colors">
                  <td className="border border-slate-700 p-1 text-center font-bold bg-slate-50 text-slate-900 align-middle">
                    {index + 1}
                  </td>
                  <td 
                    className="border border-slate-700 p-1 pl-2 align-middle cursor-pointer"
                    onClick={() => openWorkerModal(worker)}
                    title="Click para editar datos del trabajador"
                    style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                  >
                    <div className="font-semibold text-slate-900 truncate">
                      {worker.name || <span className="text-slate-400 italic font-normal print:hidden">Click para registrar...</span>}
                    </div>
                  </td>
                  <td 
                    className="border border-slate-700 p-1 text-center font-bold text-slate-800 align-middle cursor-pointer"
                    onClick={() => openWorkerModal(worker)}
                  >
                    {worker.docType || 'CC'}
                  </td>
                  <td 
                    className="border border-slate-700 p-1 text-center tabular-nums font-bold text-slate-900 align-middle cursor-pointer"
                    onClick={() => openWorkerModal(worker)}
                    style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                  >
                    {worker.docNumber || <span className="text-slate-400">---</span>}
                  </td>

                  {/* Casilla EM */}
                  <td 
                    className="border border-slate-700 p-0.5 text-center align-middle cursor-pointer hover:bg-slate-100"
                    onClick={() => handleWorkerChange(worker.id, 'em', !worker.em)}
                    title="Examen Médico Ocupacional"
                  >
                    <div className={`w-4 h-4 mx-auto border border-slate-800 flex items-center justify-center text-center font-black text-[10px] leading-none select-none ${worker.em ? 'bg-slate-900 text-white' : 'bg-white'}`}>
                      {worker.em ? 'X' : ''}
                    </div>
                  </td>

                  {/* Casilla SS */}
                  <td 
                    className="border border-slate-700 p-0.5 text-center align-middle cursor-pointer hover:bg-slate-100"
                    onClick={() => handleWorkerChange(worker.id, 'ss', !worker.ss)}
                    title="Seguridad Social Vigente"
                  >
                    <div className={`w-4 h-4 mx-auto border border-slate-800 flex items-center justify-center text-center font-black text-[10px] leading-none select-none ${worker.ss ? 'bg-slate-900 text-white' : 'bg-white'}`}>
                      {worker.ss ? 'X' : ''}
                    </div>
                  </td>

                  {/* Casilla CA */}
                  <td 
                    className="border border-slate-700 p-0.5 text-center align-middle cursor-pointer hover:bg-slate-100"
                    onClick={() => handleWorkerChange(worker.id, 'ca', !worker.ca)}
                    title="Certificado de Alturas Vigente"
                  >
                    <div className={`w-4 h-4 mx-auto border border-slate-800 flex items-center justify-center text-center font-black text-[10px] leading-none select-none ${worker.ca ? 'bg-slate-900 text-white' : 'bg-white'}`}>
                      {worker.ca ? 'X' : ''}
                    </div>
                  </td>

                  {/* Casilla PA */}
                  <td 
                    className="border border-slate-700 p-0.5 text-center align-middle cursor-pointer hover:bg-slate-100"
                    onClick={() => handleWorkerChange(worker.id, 'pa', !worker.pa)}
                    title="Persona Autorizada"
                  >
                    <div className={`w-4 h-4 mx-auto border border-slate-800 flex items-center justify-center text-center font-black text-[10px] leading-none select-none ${worker.pa ? 'bg-slate-900 text-white' : 'bg-white'}`}>
                      {worker.pa ? 'X' : ''}
                    </div>
                  </td>

                  {/* Firma del Trabajador */}
                  <td 
                    className="border border-slate-700 p-0.5 text-center align-middle bg-white cursor-pointer"
                    onClick={() => openWorkerModal(worker)}
                    title="Click para firmar"
                  >
                    {worker.signature ? (
                      <div className="flex items-center justify-center h-[26px]">
                        <img 
                          src={worker.signature} 
                          alt="Firma" 
                          style={{ maxHeight: '25px', maxWidth: '105px', objectFit: 'contain', margin: '0 auto', display: 'block' }} 
                        />
                      </div>
                    ) : (
                      <span className="text-[8px] text-slate-400 italic print:hidden">Firmar</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Botones de gestión rápida de trabajadores (ocultos en impresión) */}
      <div className="p-1.5 print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 bg-gray-50 border-t border-black text-[10px]">
        <span className="text-gray-500 font-medium">Haga clic sobre cualquier trabajador para editar datos, cambiarlo o firmar</span>
        <div className="flex flex-wrap gap-2">
          {data.workers.length > 1 && (
            <button 
              type="button" 
              onClick={() => handleRemoveWorker(data.workers[data.workers.length - 1].id)} 
              className="flex items-center text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2 py-1 rounded border border-red-200 font-semibold cursor-pointer"
            >
              <Trash2 size={11} className="mr-1" /> Quitar Fila
            </button>
          )}
          <button 
            type="button" 
            onClick={handleAddWorkerFromDirectory} 
            className="flex items-center text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded border border-emerald-200 font-semibold cursor-pointer"
          >
            <Users size={11} className="mr-1" /> Desde Directorio
          </button>
          <button 
            type="button" 
            onClick={handleAddWorker} 
            className="flex items-center text-brand-800 hover:text-brand-950 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded border border-brand-200 font-semibold cursor-pointer"
          >
            <Plus size={11} className="mr-1" /> Añadir Trabajador
          </button>
        </div>
      </div>

      {/* Ayudante de Seguridad (Fila Compacta con Bordes 100% Cerrados) */}
      <div className="border-t border-slate-700 bg-white flex flex-col sm:flex-row text-[9px] sm:text-[9.5px] items-stretch">
        <div className="flex border-b sm:border-b-0 border-r-0 sm:border-r border-slate-700">
          <div className="w-36 sm:w-32 p-1 font-bold border-r border-slate-700 bg-brand-100/90 text-brand-950 uppercase flex items-center justify-center text-center shrink-0">
            Ayudante de Seguridad
          </div>
          <div className="flex-1 sm:w-24 flex text-[9px] font-bold">
            <div 
              className={`flex-1 flex items-center justify-center gap-1 p-0.5 cursor-pointer select-none border-r border-slate-700 ${data.safetyHelper.required === 'SI' ? 'bg-emerald-100 font-black text-emerald-950' : 'hover:bg-slate-50 text-slate-700'}`}
              onClick={() => handleHelperChange('required', 'SI')}
            >
              <span>SI</span>
              <div className={`w-3.5 h-3.5 border border-slate-800 flex items-center justify-center text-center font-black text-[9px] leading-none ${data.safetyHelper.required === 'SI' ? 'bg-emerald-700 text-white' : 'bg-white'}`}>
                {data.safetyHelper.required === 'SI' ? 'X' : ''}
              </div>
            </div>
            <div 
              className={`flex-1 flex items-center justify-center gap-1 p-0.5 cursor-pointer select-none ${data.safetyHelper.required === 'N.A' ? 'bg-slate-200 font-black text-slate-950' : 'hover:bg-slate-50 text-slate-700'}`}
              onClick={() => handleHelperChange('required', 'N.A')}
            >
              <span>N.A</span>
              <div className={`w-3.5 h-3.5 border border-slate-800 flex items-center justify-center text-center font-black text-[9px] leading-none ${data.safetyHelper.required === 'N.A' ? 'bg-slate-700 text-white' : 'bg-white'}`}>
                {data.safetyHelper.required === 'N.A' ? 'X' : ''}
              </div>
            </div>
          </div>
        </div>
        <div 
          className={`flex-1 flex flex-col sm:flex-row items-stretch cursor-pointer ${data.safetyHelper.required !== 'N.A' ? 'hover:bg-slate-50' : 'opacity-60'}`}
          onClick={openHelperModal}
        >
          <div className="flex flex-1 border-b sm:border-b-0 border-r-0 sm:border-r border-slate-700">
            <div className="w-16 sm:w-16 p-1 font-semibold border-r border-slate-700 bg-brand-50/70 text-slate-800 flex items-center justify-center text-center shrink-0">
              Nombre
            </div>
            <div className="flex-1 p-1 flex items-center truncate text-[9px] sm:text-[9.5px] font-semibold text-slate-900">
              {data.safetyHelper.name || (data.safetyHelper.required !== 'N.A' ? <span className="text-slate-400 italic font-normal print:hidden">Click para registrar...</span> : '---')}
            </div>
          </div>
          <div className="flex flex-1 items-stretch">
            <div className="w-16 sm:w-16 p-1 font-semibold border-r border-slate-700 bg-brand-50/70 text-slate-800 flex items-center justify-center text-center shrink-0">
              Firma
            </div>
            <div className="flex-1 p-0.5 flex items-center justify-center min-h-[26px]">
              {data.safetyHelper.required !== 'N.A' && (
                data.safetyHelper.signature ? (
                  <img 
                    src={data.safetyHelper.signature} 
                    alt="Firma Ayudante" 
                    style={{ maxHeight: '25px', maxWidth: '100px', objectFit: 'contain', margin: '0 auto', display: 'block' }} 
                  />
                ) : (
                  <span className="text-[8px] text-slate-400 italic print:hidden">Firmar</span>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Descripción de la Actividad a Realizar */}
      <div className="border-t border-slate-700 bg-white">
        <div className="bg-brand-100/90 font-bold py-0.5 px-2 text-[9px] sm:text-[9.5px] border-b border-slate-700 uppercase text-brand-950 flex justify-between items-center">
          <span>Descripción de la Actividad a Realizar:</span>
          <span className="text-[8px] font-normal text-slate-600">Herramientas y procedimiento seguro de trabajo</span>
        </div>
        <textarea 
          className="w-full min-h-[38px] p-1.5 px-2 text-[9px] sm:text-[9.5px] leading-tight outline-none resize-none bg-transparent placeholder-slate-400 text-slate-900 font-medium"
          value={data.activityDescription}
          onChange={(e) => updateData({ activityDescription: e.target.value })}
          placeholder="Describa detalladamente la actividad, herramientas a utilizar y pasos de ejecución..."
          rows={2}
        />
      </div>
    </div>
  );
}
