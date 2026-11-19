import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import {
  PermitData,
  PermitHistoryRecord,
  PermitStatus,
  PersonnelCategory,
  PersonnelRecord,
} from '../types';
import {
  subscribePermits,
  subscribePersonnel,
  savePermitToHistory,
  deletePermitFromHistory,
  savePersonnelRecord,
  deletePersonnelRecord,
  PersonnelInput,
} from '../services/firestoreStorage';
import { validatePPETools } from './PPESection';

export type DirectoryPickCallback = (person: PersonnelRecord) => void;

interface DirectoryOpenOptions {
  filterCategory?: PersonnelCategory | 'all';
  title?: string;
  onSelect?: DirectoryPickCallback;
}

function getFirebaseAuthErrorMessage(err: unknown, fallback: string): string {
  const code = (err as { code?: string } | null)?.code || '';
  const msg = err instanceof Error ? err.message : String(err || '');
  const activeProjectId = auth.app.options.projectId || 'desconocido';

  console.error('[Firebase Auth Error]', { code, projectId: activeProjectId, error: err });

  if (code === 'auth/popup-closed-by-user' || msg.includes('popup-closed-by-user')) {
    return 'Se cerró la ventana de inicio de sesión antes de completar el acceso.';
  }
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found'
  ) {
    return 'Correo o contraseña incorrectos. Verifica tus credenciales e intenta nuevamente.';
  }
  if (code === 'auth/invalid-email') {
    return 'El formato del correo electrónico no es válido.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'Ya existe una cuenta registrada con este correo electrónico.';
  }
  if (code === 'auth/weak-password') {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Demasiados intentos fallidos. Espera unos minutos antes de volver a intentarlo.';
  }
  if (code === 'auth/operation-not-allowed' || code === 'auth/configuration-not-found') {
    return `El acceso con correo y contraseña no está habilitado en el proyecto Firebase "${activeProjectId}". Verifica Authentication → Sign-in method en Firebase Console.`;
  }
  if (code === 'auth/unauthorized-domain') {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    return `El dominio "${host}" no está autorizado en Firebase Authentication (proyecto "${activeProjectId}"). Agrégalo en Authentication → Settings → Authorized domains.`;
  }
  if (code === 'auth/admin-restricted-operation') {
    return `El registro de nuevos usuarios está restringido en el proyecto "${activeProjectId}". Crea el usuario desde Firebase Console o habilita el registro.`;
  }
  if (code === 'auth/network-request-failed') {
    return 'Error de conexión con Firebase. Verifica tu red e intenta de nuevo.';
  }
  if (code === 'auth/user-disabled') {
    return 'Esta cuenta ha sido deshabilitada por el administrador.';
  }
  return code ? `${fallback} (${code})` : fallback;
}

interface CloudSyncContextValue {
  user: User | null;
  authReady: boolean;
  signingIn: boolean;
  authError: string | null;
  clearAuthError: () => void;
  permits: PermitHistoryRecord[];
  personnel: PersonnelRecord[];
  dataLoading: boolean;
  activePermitId: string | null;
  activePermitStatus: PermitStatus | null;
  setActivePermitMeta: (id: string | null, status: PermitStatus | null) => void;
  signInWithGoogle: () => Promise<User | null>;
  signInWithEmail: (email: string, password: string) => Promise<User | null>;
  registerWithEmail: (email: string, password: string) => Promise<User | null>;
  sendPasswordReset: (email: string) => Promise<boolean>;
  signOutGoogle: () => Promise<void>;
  savePermit: (data: PermitData, forceNew?: boolean) => Promise<{ id: string; status: PermitStatus } | null>;
  deletePermit: (permitId: string) => Promise<void>;
  savePerson: (input: PersonnelInput, existingId?: string | null) => Promise<string | null>;
  deletePerson: (personId: string) => Promise<void>;
  // Global modal triggers so nested sections (WorkersSection, SignaturesSection) can open Directory seamlessly
  isDirectoryOpen: boolean;
  directoryOptions: DirectoryOpenOptions;
  openDirectory: (options?: DirectoryOpenOptions) => void;
  closeDirectory: () => void;
  isHistoryOpen: boolean;
  openHistory: () => void;
  closeHistory: () => void;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const CloudSyncContext = createContext<CloudSyncContextValue | null>(null);

export function CloudSyncProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [permits, setPermits] = useState<PermitHistoryRecord[]>([]);
  const [personnel, setPersonnel] = useState<PersonnelRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [activePermitId, setActivePermitId] = useState<string | null>(null);
  const [activePermitStatus, setActivePermitStatus] = useState<PermitStatus | null>(null);

  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const [directoryOptions, setDirectoryOptions] = useState<DirectoryOpenOptions>({});
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  useEffect(() => {
    let active = true;

    const unsub = onAuthStateChanged(auth, (currentUser) => {
      if (!active) return;
      setUser(currentUser);
      setAuthReady(true);
      if (!currentUser) {
        setPermits([]);
        setPersonnel([]);
        setDataLoading(false);
        setActivePermitId(null);
        setActivePermitStatus(null);
        setIsHistoryOpen(false);
        setIsDirectoryOpen(false);
        setIsAuthModalOpen(false);
      }
    });

    auth.authStateReady().then(() => {
      if (!active) return;
      setUser(auth.currentUser);
      setAuthReady(true);
    }).catch(() => {
      if (!active) return;
      setAuthReady(true);
    });

    return () => {
      active = false;
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;
    setDataLoading(true);
    let permitsLoaded = false;
    let personnelLoaded = false;

    const markLoaded = () => {
      if (permitsLoaded && personnelLoaded) {
        setDataLoading(false);
      }
    };

    const unsubPermits = subscribePermits(
      user.uid,
      (items) => {
        setPermits(items);
        permitsLoaded = true;
        markLoaded();
      },
      () => {
        permitsLoaded = true;
        markLoaded();
      }
    );

    const unsubPersonnel = subscribePersonnel(
      user.uid,
      (items) => {
        setPersonnel(items);
        personnelLoaded = true;
        markLoaded();
      },
      () => {
        personnelLoaded = true;
        markLoaded();
      }
    );

    return () => {
      unsubPermits();
      unsubPersonnel();
    };
  }, [authReady, user]);

  const signInWithGoogle = useCallback(async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
      setAuthReady(true);
      setIsAuthModalOpen(false);
      return result.user;
    } catch (err) {
      setAuthError(
        getFirebaseAuthErrorMessage(err, 'Error al iniciar sesión con Google. Inténtalo de nuevo.')
      );
      return null;
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setSigningIn(true);
    setAuthError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      setUser(result.user);
      setAuthReady(true);
      setIsAuthModalOpen(false);
      return result.user;
    } catch (err) {
      setAuthError(
        getFirebaseAuthErrorMessage(err, 'No se pudo iniciar sesión. Verifica tus datos.')
      );
      return null;
    } finally {
      setSigningIn(false);
    }
  }, []);

  const registerWithEmail = useCallback(async (email: string, password: string) => {
    setSigningIn(true);
    setAuthError(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      setUser(result.user);
      setAuthReady(true);
      setIsAuthModalOpen(false);
      return result.user;
    } catch (err) {
      setAuthError(
        getFirebaseAuthErrorMessage(err, 'No se pudo crear la cuenta. Intenta nuevamente.')
      );
      return null;
    } finally {
      setSigningIn(false);
    }
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return true;
    } catch (err) {
      setAuthError(
        getFirebaseAuthErrorMessage(
          err,
          'No se pudo enviar el correo de recuperación. Verifica la dirección ingresada.'
        )
      );
      return false;
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOutGoogle = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('[Firebase SignOut Error]', err);
    } finally {
      setUser(null);
      setPermits([]);
      setPersonnel([]);
      setDataLoading(false);
      setAuthError(null);
      setActivePermitId(null);
      setActivePermitStatus(null);
      setIsHistoryOpen(false);
      setIsDirectoryOpen(false);
      setIsAuthModalOpen(false);
    }
  }, []);

  const setActivePermitMeta = useCallback((id: string | null, status: PermitStatus | null) => {
    setActivePermitId(id);
    setActivePermitStatus(status);
  }, []);

  const savePermit = useCallback(
    async (data: PermitData, forceNew = false) => {
      if (!user) return null;
      const toolValidation = validatePPETools(data.ppe?.tools);
      if (!toolValidation.isValid) {
        throw new Error(toolValidation.message);
      }
      const shouldForceNew = forceNew || activePermitStatus === 'cerrado';
      const result = await savePermitToHistory(
        user.uid,
        data,
        shouldForceNew ? null : activePermitId,
        shouldForceNew
      );
      setActivePermitId(result.id);
      setActivePermitStatus(result.status);
      return result;
    },
    [user, activePermitId, activePermitStatus]
  );

  const deletePermit = useCallback(
    async (permitId: string) => {
      if (!user) return;
      await deletePermitFromHistory(permitId);
      if (activePermitId === permitId) {
        setActivePermitId(null);
        setActivePermitStatus(null);
      }
    },
    [user, activePermitId]
  );

  const savePerson = useCallback(
    async (input: PersonnelInput, existingId?: string | null) => {
      if (!user) return null;
      return await savePersonnelRecord(user.uid, input, existingId);
    },
    [user]
  );

  const deletePerson = useCallback(
    async (personId: string) => {
      if (!user) return;
      await deletePersonnelRecord(personId);
    },
    [user]
  );

  const openDirectory = useCallback((options?: DirectoryOpenOptions) => {
    setDirectoryOptions(options || {});
    setIsDirectoryOpen(true);
  }, []);

  const closeDirectory = useCallback(() => {
    setIsDirectoryOpen(false);
    setDirectoryOptions({});
  }, []);

  const openHistory = useCallback(() => setIsHistoryOpen(true), []);
  const closeHistory = useCallback(() => setIsHistoryOpen(false), []);
  const openAuthModal = useCallback(() => {
    setAuthError(null);
    setIsAuthModalOpen(true);
  }, []);
  const closeAuthModal = useCallback(() => {
    setAuthError(null);
    setIsAuthModalOpen(false);
  }, []);

  return (
    <CloudSyncContext.Provider
      value={{
        user,
        authReady,
        signingIn,
        authError,
        clearAuthError,
        permits,
        personnel,
        dataLoading,
        activePermitId,
        activePermitStatus,
        setActivePermitMeta,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        sendPasswordReset,
        signOutGoogle,
        savePermit,
        deletePermit,
        savePerson,
        deletePerson,
        isDirectoryOpen,
        directoryOptions,
        openDirectory,
        closeDirectory,
        isHistoryOpen,
        openHistory,
        closeHistory,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
    </CloudSyncContext.Provider>
  );
}

export function useCloudSync() {
  const ctx = useContext(CloudSyncContext);
  if (!ctx) {
    throw new Error('useCloudSync must be used within a CloudSyncProvider');
  }
  return ctx;
}
