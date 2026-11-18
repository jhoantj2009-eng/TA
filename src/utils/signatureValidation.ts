import { PermitData } from '../types';

/**
 * Checks if a base64 or dataURL signature string is present and has valid stroke data.
 */
export function isSignatureFilled(signature?: string | null): boolean {
  if (!signature || typeof signature !== 'string') return false;
  const trimmed = signature.trim();
  if (!trimmed || trimmed === '') return false;
  if (!trimmed.startsWith('data:image/')) return false;
  // A non-empty canvas export has substantial length (actual strokes are typically > 1000 chars)
  // Transparent/empty placeholders or broken dataURLs are very short (< 150 chars)
  if (trimmed.length < 150) return false;
  return true;
}

export interface SignatureValidationStatus {
  isValid: boolean;
  sstValid: boolean;
  workerValid: boolean;
  activeWorkerCount: number;
  signedWorkerCount: number;
  missingMessages: string[];
}

/**
 * Validates that both the SST coordinator/responsible person and
 * the authorized worker(s) have performed a signature (canvas non-empty)
 * before permitting PDF generation.
 */
export function validateSignaturesForPdf(data: PermitData): SignatureValidationStatus {
  const missingMessages: string[] = [];

  // 1. SST Responsible Signature (Coordinador de Trabajo en Alturas SST / Supervisor)
  const sstValid = isSignatureFilled(data.coordinator?.signature) || isSignatureFilled(data.authorizer?.signature);
  if (!sstValid) {
    missingMessages.push('Firma del Responsable del SST (Coordinador de Trabajo en Alturas) obligatoria.');
  }

  // 2. Worker Signature
  const allWorkers = data.workers || [];
  // Consider active workers: workers with name, docNumber, or existing signature
  const activeWorkers = allWorkers.filter(w => 
    (w.name && w.name.trim() !== '') || 
    (w.docNumber && w.docNumber.trim() !== '') ||
    isSignatureFilled(w.signature)
  );

  // If no worker fields are filled yet, evaluate at least the default first worker row
  const workersToCheck = activeWorkers.length > 0 ? activeWorkers : (allWorkers.slice(0, 1));

  let signedWorkerCount = 0;
  const unsignedWorkerNames: string[] = [];

  workersToCheck.forEach((w, idx) => {
    if (isSignatureFilled(w.signature)) {
      signedWorkerCount++;
    } else {
      const label = w.name?.trim() ? `"${w.name.trim()}"` : `Trabajador #${idx + 1}`;
      unsignedWorkerNames.push(label);
    }
  });

  // Both condition: at least 1 signed worker, and all specified workers must have signed
  const workerValid = workersToCheck.length > 0 && signedWorkerCount > 0 && unsignedWorkerNames.length === 0;

  if (!workerValid) {
    if (workersToCheck.length === 0 || signedWorkerCount === 0) {
      missingMessages.push('Firma del Trabajador Autorizado obligatoria (el lienzo no puede estar vacío).');
    } else if (unsignedWorkerNames.length > 0) {
      missingMessages.push(`Falta la firma de: ${unsignedWorkerNames.join(', ')}.`);
    }
  }

  return {
    isValid: sstValid && workerValid,
    sstValid,
    workerValid,
    activeWorkerCount: workersToCheck.length,
    signedWorkerCount,
    missingMessages
  };
}
