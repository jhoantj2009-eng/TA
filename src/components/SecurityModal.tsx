import React, { useState } from 'react';
import { KeyRound, X, Check, AlertCircle, ShieldCheck, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { 
  getStoredAccessCode, 
  saveAccessCode, 
  resetToDefaultAccessCode, 
  isUsingDefaultCode 
} from '../utils/security';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCodeChanged?: () => void;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({ isOpen, onClose, onCodeChanged }) => {
  const [currentCodeInput, setCurrentCodeInput] = useState('');
  const [newCodeInput, setNewCodeInput] = useState('');
  const [confirmCodeInput, setConfirmCodeInput] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const actualCode = getStoredAccessCode();

    if (currentCodeInput.trim() !== actualCode.trim()) {
      setError('El código actual ingresado es incorrecto.');
      return;
    }

    const trimmedNew = newCodeInput.trim();
    if (trimmedNew.length < 4) {
      setError('El nuevo código debe tener al menos 4 caracteres.');
      return;
    }

    if (trimmedNew !== confirmCodeInput.trim()) {
      setError('La confirmación no coincide con el nuevo código.');
      return;
    }

    const saved = saveAccessCode(trimmedNew);
    if (saved) {
      setSuccess('¡Código de acceso modificado con éxito!');
      setCurrentCodeInput('');
      setNewCodeInput('');
      setConfirmCodeInput('');
      if (onCodeChanged) onCodeChanged();
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 1500);
    } else {
      setError('Error al guardar en el almacenamiento local.');
    }
  };

  const handleResetToDefault = () => {
    if (window.confirm('¿Desea restablecer el código de acceso al valor predeterminado?')) {
      resetToDefaultAccessCode();
      setSuccess('Se ha restablecido el código de acceso predeterminado.');
      setCurrentCodeInput('');
      setNewCodeInput('');
      setConfirmCodeInput('');
      setError(null);
      if (onCodeChanged) onCodeChanged();
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 1500);
    }
  };

  const isDefault = isUsingDefaultCode();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div 
        id="security-modal-container"
        className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-white animate-scaleUp"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-950/90 border border-brand-700/60 text-brand-300">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white">Código de Acceso</h2>
              <p className="text-xs text-slate-400">Modificar la contraseña de seguridad</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Status Badge */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className={`w-4 h-4 ${isDefault ? 'text-brand-300' : 'text-emerald-400'}`} />
              <span>Estado actual:</span>
            </div>
            <span className={`font-semibold px-2 py-0.5 rounded-md text-[11px] ${
              isDefault ? 'bg-brand-950 text-brand-200 border border-brand-700' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
            }`}>
              {isDefault ? 'Código predeterminado activo' : 'Código Personalizado'}
            </span>
          </div>

          {/* Alerts */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-950/80 border border-red-800 rounded-xl text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs text-emerald-300">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Contraseña Actual <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={currentCodeInput}
                  onChange={(e) => setCurrentCodeInput(e.target.value)}
                  placeholder="Ingrese el código actual"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 focus:border-brand-500 rounded-xl text-sm text-white placeholder-slate-500 outline-none pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                >
                  {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nueva Contraseña de Acceso <span className="text-red-400">*</span>
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={newCodeInput}
                onChange={(e) => setNewCodeInput(e.target.value)}
                placeholder="Mínimo 4 caracteres"
                required
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 focus:border-brand-500 rounded-xl text-sm text-white placeholder-slate-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Confirmar Nueva Contraseña <span className="text-red-400">*</span>
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={confirmCodeInput}
                onChange={(e) => setConfirmCodeInput(e.target.value)}
                placeholder="Repita la nueva contraseña"
                required
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 focus:border-brand-500 rounded-xl text-sm text-white placeholder-slate-500 outline-none"
              />
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Guardar Nuevo Código</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </form>

          {/* Reset button option */}
          {!isDefault && (
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">¿Olvidó o desea restablecer?</span>
              <button
                type="button"
                onClick={handleResetToDefault}
                className="text-[11px] text-brand-300 hover:text-brand-200 flex items-center gap-1 underline transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restablecer a código de fábrica</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
