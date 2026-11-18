import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
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

interface CloudSyncContextValue {
  user: User | null;
  authReady: boolean;
  signingIn: boolean;
  authError: string | null;
  permits: PermitHistoryRecord[];
  personnel: PersonnelRecord[];
  dataLoading: boolean;
  activePermitId: string | null;
  activePermitStatus: PermitStatus | null;
  setActivePermitMeta: (id: string | null, status: PermitStatus | null) => void;
  signInWithGoogle: () => Promise<User | null>;
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
}

const CloudSyncContext = createContext<CloudSyncContextValue | null>(null);

export function CloudSyncProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (!currentUser) {
        setPermits([]);
        setPersonnel([]);
        setDataLoading(false);
      }
    });
    return () => unsub();
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
      return result.user;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo iniciar sesión con Google.';
      if (msg.includes('popup-closed-by-user')) {
        setAuthError('Se cerró la ventana de inicio de sesión antes de completar el acceso.');
      } else {
        setAuthError('Error al iniciar sesión con Google. Inténtalo de nuevo.');
      }
      return null;
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOutGoogle = useCallback(async () => {
    await signOut(auth);
    setActivePermitId(null);
    setActivePermitStatus(null);
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

  return (
    <CloudSyncContext.Provider
      value={{
        user,
        authReady,
        signingIn,
        authError,
        permits,
        personnel,
        dataLoading,
        activePermitId,
        activePermitStatus,
        setActivePermitMeta,
        signInWithGoogle,
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
