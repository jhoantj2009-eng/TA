import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  PermitData,
  PermitHistoryRecord,
  PermitStatus,
  PersonnelCategory,
  PersonnelDocType,
  PersonnelRecord,
  initialPermitData,
} from '../types';
import { DEFAULT_INVEASAS_LOGO } from '../defaultLogo';
import { validateSignaturesForPdf, isSignatureFilled } from '../utils/signatureValidation';

const PERMITS_COLLECTION = 'permits';
const PERSONNEL_COLLECTION = 'personnel';

const ALLOWED_DOC_TYPES: PersonnelDocType[] = ['CC', 'CE', 'TI', 'PAS', 'PEP'];
const ALLOWED_CATEGORIES: PersonnelCategory[] = [
  'worker',
  'coordinator',
  'authorizer',
  'emergencyActivator',
  'safetyHelper',
  'general',
];

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefined(v);
      }
    }
    return out as T;
  }
  return value;
}

function clampString(value: unknown, maxLength: number, fallback = ''): string {
  const str = typeof value === 'string' ? value : fallback;
  return str.slice(0, maxLength);
}

function normalizeDocType(value: unknown): PersonnelDocType {
  const upper = typeof value === 'string' ? value.trim().toUpperCase() : 'CC';
  return (ALLOWED_DOC_TYPES.includes(upper as PersonnelDocType) ? upper : 'CC') as PersonnelDocType;
}

function normalizeCategory(value: unknown): PersonnelCategory {
  return (ALLOWED_CATEGORIES.includes(value as PersonnelCategory)
    ? value
    : 'worker') as PersonnelCategory;
}

function toDateOrNull(ts: unknown): Date | null {
  if (!ts) return null;
  if (ts instanceof Timestamp) return ts.toDate();
  if (typeof (ts as { toDate?: () => Date }).toDate === 'function') {
    return (ts as { toDate: () => Date }).toDate();
  }
  return null;
}

export function computePermitStatus(data: PermitData): PermitStatus {
  const hasClosure =
    Boolean(data.closure?.closingTime?.trim()) ||
    isSignatureFilled(data.closure?.deliverySig) ||
    isSignatureFilled(data.closure?.receivedSig);
  if (hasClosure) return 'cerrado';

  const sigCheck = validateSignaturesForPdf(data);
  if (sigCheck.isValid) return 'activo';

  return 'borrador';
}

export function getNextPermitNumber(
  permits: PermitHistoryRecord[],
  currentNumber?: string
): string {
  let maxNum = 0;
  const parseNumeric = (val?: string) => {
    if (!val) return 0;
    const match = val.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };
  maxNum = Math.max(maxNum, parseNumeric(currentNumber));
  for (const p of permits) {
    maxNum = Math.max(maxNum, parseNumeric(p.permitNumber));
  }
  const next = maxNum + 1;
  return String(next).padStart(3, '0');
}

export function buildDuplicatedPermitData(
  source: PermitData,
  nextPermitNumber: string
): PermitData {
  const todayStr = new Date().toISOString().slice(0, 10);
  const cloned = stripUndefined(JSON.parse(JSON.stringify(source)) as PermitData);
  return {
    ...initialPermitData,
    ...cloned,
    permitNumber: nextPermitNumber,
    date: todayStr,
    validUntil: todayStr,
    revalidation: {
      suspensionTime: '',
      suspensionReason: '',
      resumeTime: '',
      cancelTime: '',
      cancelReason: '',
    },
    closure: {
      closingTime: '',
      deliveryName: '',
      deliverySig: '',
      receivedName: '',
      receivedSig: '',
    },
  };
}

function sanitizePermitDataForStorage(data: PermitData): PermitData {
  const clean = stripUndefined(JSON.parse(JSON.stringify(data)) as PermitData);
  clean.permitNumber = clampString(clean.permitNumber || '001', 40, '001');
  clean.workers = Array.isArray(clean.workers) ? clean.workers.slice(0, 30) : [];
  if (
    !clean.companyLogo ||
    clean.companyLogo === DEFAULT_INVEASAS_LOGO ||
    clean.companyLogo.length > 180000
  ) {
    clean.companyLogo = '';
  }
  return clean;
}

function buildWorkerSummary(data: PermitData): string {
  const names = (data.workers || [])
    .map((w) => {
      const name = w.name?.trim();
      const docNum = w.docNumber?.trim();
      if (!name && !docNum) return '';
      return docNum ? `${name || 'Sin nombre'} (${docNum})` : name || '';
    })
    .filter(Boolean);
  return clampString(names.join(', '), 500);
}

export function subscribePermits(
  ownerId: string,
  onData: (permits: PermitHistoryRecord[]) => void,
  onError?: (error: Error) => void
): () => void {
  const q = query(
    collection(db, PERMITS_COLLECTION),
    where('ownerId', '==', ownerId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: PermitHistoryRecord[] = snapshot.docs.map((d) => {
        const raw = d.data();
        return {
          id: d.id,
          ownerId: raw.ownerId || ownerId,
          permitNumber: raw.permitNumber || '',
          date: raw.date || '',
          validUntil: raw.validUntil || '',
          location: raw.location || '',
          workType: raw.workType || '',
          workHeight: raw.workHeight || '',
          contractingCompany: raw.contractingCompany || '',
          contractorCompany: raw.contractorCompany || '',
          activityDescription: raw.activityDescription || '',
          workerSummary: raw.workerSummary || '',
          status: raw.status || 'borrador',
          permitData: raw.permitData as PermitData,
          createdAt: toDateOrNull(raw.createdAt),
          updatedAt: toDateOrNull(raw.updatedAt),
        };
      });

      list.sort((a, b) => {
        const tA = a.updatedAt ? a.updatedAt.getTime() : 0;
        const tB = b.updatedAt ? b.updatedAt.getTime() : 0;
        return tB - tA;
      });
      onData(list);
    },
    (err) => {
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.LIST, PERMITS_COLLECTION);
    }
  );
}

export async function savePermitToHistory(
  ownerId: string,
  data: PermitData,
  existingPermitId?: string | null,
  forceNew = false
): Promise<{ id: string; status: PermitStatus }> {
  const status = computePermitStatus(data);
  const sanitizedPermitData = sanitizePermitDataForStorage(data);

  const mutableFields = {
    permitNumber: clampString(data.permitNumber || '001', 40, '001'),
    date: clampString(data.date, 20),
    validUntil: clampString(data.validUntil, 20),
    location: clampString(data.location, 200),
    workType: clampString(data.workType, 160),
    workHeight: clampString(data.workHeight, 80),
    contractingCompany: clampString(data.contractingCompany, 160),
    contractorCompany: clampString(data.contractorCompany, 160),
    activityDescription: clampString(data.activityDescription, 1500),
    workerSummary: buildWorkerSummary(data),
    status,
    permitData: sanitizedPermitData,
  };

  if (existingPermitId && !forceNew) {
    const docRef = doc(db, PERMITS_COLLECTION, existingPermitId);
    try {
      await updateDoc(docRef, {
        ...mutableFields,
        updatedAt: serverTimestamp(),
      });
      return { id: existingPermitId, status };
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `${PERMITS_COLLECTION}/${existingPermitId}`
      );
    }
  } else {
    const newDocRef = doc(collection(db, PERMITS_COLLECTION));
    try {
      await setDoc(newDocRef, {
        ownerId: clampString(ownerId, 128),
        ...mutableFields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { id: newDocRef.id, status };
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.CREATE,
        `${PERMITS_COLLECTION}/${newDocRef.id}`
      );
    }
  }
}

export async function deletePermitFromHistory(permitId: string): Promise<void> {
  const path = `${PERMITS_COLLECTION}/${permitId}`;
  try {
    await deleteDoc(doc(db, PERMITS_COLLECTION, permitId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribePersonnel(
  ownerId: string,
  onData: (personnel: PersonnelRecord[]) => void,
  onError?: (error: Error) => void
): () => void {
  const q = query(
    collection(db, PERSONNEL_COLLECTION),
    where('ownerId', '==', ownerId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: PersonnelRecord[] = snapshot.docs.map((d) => {
        const raw = d.data();
        return {
          id: d.id,
          ownerId: raw.ownerId || ownerId,
          name: raw.name || '',
          docType: normalizeDocType(raw.docType),
          docNumber: raw.docNumber || '',
          category: normalizeCategory(raw.category),
          role: raw.role || '',
          em: Boolean(raw.em),
          ss: Boolean(raw.ss),
          ca: Boolean(raw.ca),
          pa: Boolean(raw.pa),
          signature: raw.signature || '',
          notes: raw.notes || '',
          createdAt: toDateOrNull(raw.createdAt),
          updatedAt: toDateOrNull(raw.updatedAt),
        };
      });

      list.sort((a, b) => a.name.localeCompare(b.name, 'es'));
      onData(list);
    },
    (err) => {
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.LIST, PERSONNEL_COLLECTION);
    }
  );
}

export interface PersonnelInput {
  name: string;
  docType?: string;
  docNumber?: string;
  category?: PersonnelCategory;
  role?: string;
  em?: boolean;
  ss?: boolean;
  ca?: boolean;
  pa?: boolean;
  signature?: string;
  notes?: string;
}

export async function savePersonnelRecord(
  ownerId: string,
  input: PersonnelInput,
  existingId?: string | null
): Promise<string> {
  const cleanName = clampString(input.name.trim(), 140);
  if (!cleanName) {
    throw new Error('El nombre completo es obligatorio para guardar en el directorio.');
  }
  const cleanSig = input.signature || '';
  if (cleanSig.length > 250000) {
    throw new Error('La firma excede el tamaño máximo permitido.');
  }

  const mutableFields = {
    name: cleanName,
    docType: normalizeDocType(input.docType || 'CC'),
    docNumber: clampString((input.docNumber || '').trim(), 40),
    category: normalizeCategory(input.category || 'worker'),
    role: clampString((input.role || '').trim(), 120),
    em: Boolean(input.em),
    ss: Boolean(input.ss),
    ca: Boolean(input.ca),
    pa: Boolean(input.pa),
    signature: cleanSig,
    notes: clampString((input.notes || '').trim(), 300),
  };

  if (existingId) {
    const docRef = doc(db, PERSONNEL_COLLECTION, existingId);
    try {
      await updateDoc(docRef, {
        ...mutableFields,
        updatedAt: serverTimestamp(),
      });
      return existingId;
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `${PERSONNEL_COLLECTION}/${existingId}`
      );
    }
  } else {
    const newDocRef = doc(collection(db, PERSONNEL_COLLECTION));
    try {
      await setDoc(newDocRef, {
        ownerId: clampString(ownerId, 128),
        ...mutableFields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return newDocRef.id;
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.CREATE,
        `${PERSONNEL_COLLECTION}/${newDocRef.id}`
      );
    }
  }
}

export async function deletePersonnelRecord(personId: string): Promise<void> {
  const path = `${PERSONNEL_COLLECTION}/${personId}`;
  try {
    await deleteDoc(doc(db, PERSONNEL_COLLECTION, personId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
