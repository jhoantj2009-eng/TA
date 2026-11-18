import React, { useState } from 'react';
import { CheckCircle2, X, Check } from 'lucide-react';
import { PermitData } from '../types';
import { SignaturePad } from './SignaturePad';
import { TimeSelector } from './DateTimeSelectors';

interface ClosureSectionProps {
  data: PermitData;
  updateData: (data: Partial<PermitData>) => void;
}

export function ClosureSection({ data, updateData }: ClosureSectionProps) {
  const [activeModal, setActiveModal] = useState<'delivery' | 'received' | null>(null);
  const [modalName, setModalName] = useState('');
  const [modalSig, setModalSig] = useState('');

  const closure = data.closure || {
    closingTime: '',
    deliveryName: '',
    deliverySig: '',
    receivedName: '',
    receivedSig: ''
  };

  const handleOpenModal = (type: 'delivery' | 'received') => {
    setActiveModal(type);
    if (type === 'delivery') {
      setModalName(closure.deliveryName);
      setModalSig(closure.deliverySig);
    } else {
      setModalName(closure.receivedName);
      setModalSig(closure.receivedSig);
    }
  };

  const handleSaveModal = () => {
    if (!activeModal) return;
    if (activeModal === 'delivery') {
      updateData({
        closure: {
          ...closure,
          deliveryName: modalName,
          deliverySig: modalSig
        }
      });
    } else {
      updateData({
        closure: {
          ...closure,
          receivedName: modalName,
          receivedSig: modalSig
        }
      });
    }
    setActiveModal(null);
  };

  return (
    <div className="border border-slate-700 mb-1 bg-white shadow-2xs text-[8.5px] sm:text-[9px]">
      {/* Modal para firmas de cierre */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:hidden">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
            <div className="bg-brand-800 text-white p-3 font-bold flex justify-between items-center">
              <span>{activeModal === 'delivery' ? 'Firma Entrega (Ejecutor / Trabajador)' : 'Firma Recibido (Coordinador SST)'}</span>
              <button type="button" onClick={() => setActiveModal(null)} className="hover:bg-brand-900 p-1 rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo</label>
                <input 
                  type="text" 
                  value={modalName} 
                  onChange={(e) => setModalName(e.target.value)} 
                  className="w-full border border-slate-300 rounded p-2 text-sm focus:outline-none focus:border-brand-600" 
                  placeholder="Ej. Nombre y Cédula de quien entrega/recibe"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Firma</label>
                <div className="w-full flex justify-center bg-slate-50 border border-slate-200 rounded p-2">
                  <SignaturePad 
                    initialValue={modalSig}
                    onSave={(sig) => setModalSig(sig)} 
                    label="Dibuje su firma de cierre" 
                  />
                </div>
              </div>
            </div>
            <div className="bg-slate-100 p-3 flex justify-end gap-2 border-t border-slate-200">
              <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded">
                Cancelar
              </button>
              <button type="button" onClick={handleSaveModal} className="px-4 py-2 text-sm font-semibold bg-brand-700 hover:bg-brand-800 text-white rounded flex items-center gap-1 shadow-sm">
                <Check size={16} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cabecera con azul petróleo corporativo */}
      <div className="bg-brand-700 text-white font-bold py-1 px-2 text-[10.5px] sm:text-xs uppercase tracking-wider text-center relative border-b border-slate-700 flex items-center justify-center">
        <span>VIII. DECLARACIÓN DE CUMPLIMIENTO Y CIERRE DEL PERMISO</span>
      </div>

      {/* Texto Legal Declarativo */}
      <p className="py-1 px-3 text-slate-800 leading-tight text-[8px] sm:text-[8.5px] text-center border-b border-slate-400 bg-brand-50/30 font-medium">
        Se hace constar que se han inspeccionado las condiciones físicas, meteorológicas y de seguridad del sitio de trabajo. Los trabajadores portaron sus EPP certificados. Al finalizar las labores se suspendió la actividad, se retiraron equipos y se entrega el área completamente limpia y segura.
      </p>

      {/* Controles de Cierre y Firmas Emparejadas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-700 text-[8px] sm:text-[8.5px] bg-white">
        
        {/* Hora y Estado del Área */}
        <div className="flex flex-col justify-around p-1.5 bg-brand-50/50 items-center text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="font-bold text-slate-800 uppercase text-[8px]">Hora Cierre:</span>
            <TimeSelector
              value={closure.closingTime}
              onChange={(val) =>
                updateData({
                  closure: {
                    ...closure,
                    closingTime: val
                  }
                })
              }
              ariaLabel="Hora de Cierre"
              className="border-b border-slate-500 px-1 min-w-[68px] font-black text-brand-900 text-[9px]"
            />
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            <span className="font-bold text-slate-800 uppercase text-[8px]">Área Despejada:</span>
            <span className="border border-emerald-700 px-2 py-0.5 font-black bg-emerald-50 text-emerald-950 flex items-center gap-1 text-[8px] rounded-xs shadow-2xs">
              <CheckCircle2 size={11} className="text-emerald-700" /> CONFORME
            </span>
          </div>
        </div>

        {/* Firma Entrega: Ejecutor */}
        <div 
          className="flex flex-col p-1.5 cursor-pointer hover:bg-slate-50/80 transition-colors items-center text-center"
          onClick={() => handleOpenModal('delivery')}
          title="Click para firmar entrega"
        >
          <div className="font-bold text-brand-950 text-center mb-0.5 text-[8px] sm:text-[8.5px] uppercase font-black">
            Entrega (Ejecutor / Trabajador):
          </div>
          <div className="h-[36px] w-full border-b border-slate-400 flex items-center justify-center bg-white">
            {closure.deliverySig ? (
              <img src={closure.deliverySig} alt="Firma Entrega" style={{ maxHeight: '32px', maxWidth: '120px', objectFit: 'contain' }} />
            ) : (
              <span className="text-[7.5px] text-slate-400 italic print:hidden">Click para firmar</span>
            )}
          </div>
          <div className="text-[7px] text-slate-500 font-bold uppercase py-0.5">Línea de Firma y Entrega</div>
          <div className="truncate text-center font-bold text-slate-900 text-[8px] sm:text-[8.5px]">
            {closure.deliveryName || 'Nombre y Cédula'}
          </div>
        </div>

        {/* Firma Recibe: Coordinador SST */}
        <div 
          className="flex flex-col p-1.5 cursor-pointer hover:bg-slate-50/80 transition-colors items-center text-center"
          onClick={() => handleOpenModal('received')}
          title="Click para firmar recibido"
        >
          <div className="font-bold text-brand-950 text-center mb-0.5 text-[8px] sm:text-[8.5px] uppercase font-black">
            Recibe (Coordinador SST / Supervisor):
          </div>
          <div className="h-[36px] w-full border-b border-slate-400 flex items-center justify-center bg-white">
            {closure.receivedSig ? (
              <img src={closure.receivedSig} alt="Firma Recibe" style={{ maxHeight: '32px', maxWidth: '120px', objectFit: 'contain' }} />
            ) : (
              <span className="text-[7.5px] text-slate-400 italic print:hidden">Click para firmar</span>
            )}
          </div>
          <div className="text-[7px] text-slate-500 font-bold uppercase py-0.5">Línea de Firma y Recepción</div>
          <div className="truncate text-center font-bold text-slate-900 text-[8px] sm:text-[8.5px]">
            {closure.receivedName || 'Nombre y Cédula'}
          </div>
        </div>

      </div>
    </div>
  );
}
