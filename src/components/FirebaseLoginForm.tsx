import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  LogIn,
  UserPlus,
  KeyRound,
  ArrowLeft,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { useCloudSync } from './CloudSyncContext';

type AuthMode = 'login' | 'register' | 'reset';

interface ValidationErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export interface FirebaseLoginFormProps {
  title?: string;
  subtitle?: string;
  onSuccess?: (user: User) => void;
  showGoogleOption?: boolean;
  className?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function FirebaseLoginForm({
  title = 'Iniciar sesión en la nube',
  subtitle = 'Accede con tu correo electrónico y contraseña o con tu cuenta de Google para sincronizar permisos y personal.',
  onSuccess,
  showGoogleOption = true,
  className = '',
}: FirebaseLoginFormProps) {
  const {
    signingIn,
    authError,
    clearAuthError,
    signInWithEmail,
    registerWithEmail,
    sendPasswordReset,
    signInWithGoogle,
  } = useCloudSync();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [resetSentMessage, setResetSentMessage] = useState<string | null>(null);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setFieldErrors({});
    setResetSentMessage(null);
    clearAuthError();
  };

  const validateFields = (): boolean => {
    const errors: ValidationErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      errors.email = 'Ingresa tu correo electrónico.';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = 'Ingresa un correo electrónico válido (ej. usuario@empresa.com).';
    }

    if (mode !== 'reset') {
      if (!password) {
        errors.password = 'Ingresa tu contraseña.';
      } else if (password.length < 6) {
        errors.password = 'La contraseña debe tener al menos 6 caracteres.';
      }

      if (mode === 'register') {
        if (!confirmPassword) {
          errors.confirmPassword = 'Confirma tu contraseña.';
        } else if (confirmPassword !== password) {
          errors.confirmPassword = 'Las contraseñas no coinciden.';
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetSentMessage(null);

    if (!validateFields()) {
      return;
    }

    if (mode === 'reset') {
      const ok = await sendPasswordReset(email);
      if (ok) {
        setResetSentMessage(
          `Si existe una cuenta asociada a ${email.trim()}, recibirás un enlace para restablecer tu contraseña.`
        );
      }
      return;
    }

    const signedUser =
      mode === 'login'
        ? await signInWithEmail(email, password)
        : await registerWithEmail(email, password);

    if (signedUser && onSuccess) {
      onSuccess(signedUser);
    }
  };

  const handleGoogleLogin = async () => {
    setFieldErrors({});
    setResetSentMessage(null);
    const signedUser = await signInWithGoogle();
    if (signedUser && onSuccess) {
      onSuccess(signedUser);
    }
  };

  return (
    <div className={`w-full max-w-md mx-auto text-left ${className}`}>
      {/* Encabezado */}
      <div className="text-center mb-4">
        <h3 className="text-base font-bold text-slate-900">
          {mode === 'login'
            ? title
            : mode === 'register'
              ? 'Crear cuenta con correo'
              : 'Recuperar contraseña'}
        </h3>
        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
          {mode === 'reset'
            ? 'Ingresa el correo electrónico asociado a tu cuenta para enviarte un enlace de recuperación.'
            : subtitle}
        </p>
      </div>

      {/* Selector de modo Iniciar sesión / Crear cuenta */}
      {mode !== 'reset' && (
        <div
          className="grid grid-cols-2 gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg mb-4"
          role="tablist"
          aria-label="Modo de autenticación"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            onClick={() => switchMode('login')}
            className={`py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-brand-800 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn size={14} />
            <span>Iniciar sesión</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            onClick={() => switchMode('register')}
            className={`py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-brand-800 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus size={14} />
            <span>Crear cuenta</span>
          </button>
        </div>
      )}

      {/* Alertas de Firebase Auth o confirmación de recuperación */}
      {authError && (
        <div
          role="alert"
          className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2"
        >
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>{authError}</span>
        </div>
      )}

      {resetSentMessage && (
        <div
          role="status"
          className="mb-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2"
        >
          <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
          <span>{resetSentMessage}</span>
        </div>
      )}

      {/* Formulario de Correo y Contraseña */}
      <form onSubmit={handleSubmit} noValidate className="space-y-3">
        <div>
          <label
            htmlFor="firebase-login-email"
            className="block text-xs font-semibold text-slate-700 mb-1"
          >
            Correo electrónico
          </label>
          <div className="relative">
            <Mail
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              id="firebase-login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) {
                  setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }
                if (authError) clearAuthError();
              }}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'firebase-login-email-error' : undefined}
              placeholder="usuario@empresa.com"
              className={`w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border rounded-lg outline-none transition-colors text-slate-900 placeholder:text-slate-400 ${
                fieldErrors.email
                  ? 'border-red-400 focus:border-red-500 ring-1 ring-red-200'
                  : 'border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/15'
              }`}
            />
          </div>
          {fieldErrors.email && (
            <p id="firebase-login-email-error" className="mt-1 text-[11px] font-medium text-red-600">
              {fieldErrors.email}
            </p>
          )}
        </div>

        {mode !== 'reset' && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="firebase-login-password"
                className="block text-xs font-semibold text-slate-700"
              >
                Contraseña
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => switchMode('reset')}
                  className="text-[11px] font-semibold text-brand-700 hover:text-brand-900 hover:underline cursor-pointer"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                id="firebase-login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }
                  if (authError) clearAuthError();
                }}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={
                  fieldErrors.password ? 'firebase-login-password-error' : undefined
                }
                placeholder="Mínimo 6 caracteres"
                className={`w-full pl-9 pr-10 py-2 text-xs sm:text-sm bg-white border rounded-lg outline-none transition-colors text-slate-900 placeholder:text-slate-400 ${
                  fieldErrors.password
                    ? 'border-red-400 focus:border-red-500 ring-1 ring-red-200'
                    : 'border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/15'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {fieldErrors.password && (
              <p
                id="firebase-login-password-error"
                className="mt-1 text-[11px] font-medium text-red-600"
              >
                {fieldErrors.password}
              </p>
            )}
          </div>
        )}

        {mode === 'register' && (
          <div>
            <label
              htmlFor="firebase-login-confirm-password"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Confirmar contraseña
            </label>
            <div className="relative">
              <Lock
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                id="firebase-login-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirmPassword) {
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }
                  if (authError) clearAuthError();
                }}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                aria-describedby={
                  fieldErrors.confirmPassword ? 'firebase-login-confirm-error' : undefined
                }
                placeholder="Repite tu contraseña"
                className={`w-full pl-9 pr-10 py-2 text-xs sm:text-sm bg-white border rounded-lg outline-none transition-colors text-slate-900 placeholder:text-slate-400 ${
                  fieldErrors.confirmPassword
                    ? 'border-red-400 focus:border-red-500 ring-1 ring-red-200'
                    : 'border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/15'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={
                  showConfirmPassword ? 'Ocultar confirmación' : 'Mostrar confirmación'
                }
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p
                id="firebase-login-confirm-error"
                className="mt-1 text-[11px] font-medium text-red-600"
              >
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={signingIn}
          className="w-full min-h-[42px] px-4 py-2 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
        >
          {signingIn ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Procesando...</span>
            </>
          ) : mode === 'login' ? (
            <>
              <LogIn size={16} />
              <span>Iniciar sesión</span>
            </>
          ) : mode === 'register' ? (
            <>
              <UserPlus size={16} />
              <span>Crear cuenta</span>
            </>
          ) : (
            <>
              <KeyRound size={16} />
              <span>Enviar enlace de recuperación</span>
            </>
          )}
        </button>

        {mode === 'reset' && (
          <button
            type="button"
            onClick={() => switchMode('login')}
            className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Volver al inicio de sesión</span>
          </button>
        )}
      </form>

      {/* Alternativa con Google ya configurada */}
      {showGoogleOption && mode !== 'reset' && (
        <>
          <div className="relative my-4 flex items-center">
            <div className="flex-1 border-t border-slate-200" />
            <span className="px-2.5 text-[11px] font-medium text-slate-400 uppercase">o</span>
            <div className="flex-1 border-t border-slate-200" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={signingIn}
            className="w-full min-h-[42px] px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
          >
            {signingIn ? (
              <Loader2 size={16} className="animate-spin text-brand-700" />
            ) : (
              <CheckCircle2 size={16} className="text-brand-700" />
            )}
            <span>Continuar con Google</span>
          </button>
        </>
      )}
    </div>
  );
}
