import { PermitData } from '../types';

export const AUTOSAVE_STORAGE_KEY = 'sst_autosave_permit_data';
export const AUTOSAVE_TIME_KEY = 'sst_autosave_timestamp';
export const AUTOSAVE_INTERVAL_MS = 30000; // 30 segundos

/**
 * Guarda el estado actual del permiso en localStorage
 */
export function savePermitDataToStorage(data: PermitData): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(AUTOSAVE_STORAGE_KEY, serialized);
    const nowIso = new Date().toISOString();
    localStorage.setItem(AUTOSAVE_TIME_KEY, nowIso);
    return true;
  } catch (error) {
    console.warn('No se pudo autoguardar el formulario en localStorage:', error);
    // En caso de cuota excedida por imágenes o canvas, intentar guardar sin logo pesado si es necesario
    try {
      const dataWithoutHeavyLogo = { ...data };
      if (dataWithoutHeavyLogo.companyLogo && dataWithoutHeavyLogo.companyLogo.length > 50000) {
        dataWithoutHeavyLogo.companyLogo = '';
      }
      localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(dataWithoutHeavyLogo));
      localStorage.setItem(AUTOSAVE_TIME_KEY, new Date().toISOString());
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Carga el borrador autoguardado desde localStorage si existe
 */
export function loadAutoSavedPermitData(): { data: Partial<PermitData>; timestamp: Date | null } | null {
  if (typeof window === 'undefined') return null;
  try {
    const rawData = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
    if (!rawData) return null;

    const parsed = JSON.parse(rawData);
    if (!parsed || typeof parsed !== 'object') return null;

    const rawTime = localStorage.getItem(AUTOSAVE_TIME_KEY);
    const timestamp = rawTime ? new Date(rawTime) : null;

    return { data: parsed, timestamp };
  } catch (error) {
    console.warn('Error al leer el borrador autoguardado:', error);
    return null;
  }
}

/**
 * Elimina el borrador autoguardado cuando el usuario limpia el formulario explícitamente
 */
export function clearAutoSavedPermitData(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
    localStorage.removeItem(AUTOSAVE_TIME_KEY);
  } catch (error) {
    console.warn('Error al limpiar el borrador autoguardado:', error);
  }
}

/**
 * Obtiene la marca de tiempo del último autoguardado registrado
 */
export function getLastAutoSaveTimestamp(): Date | null {
  if (typeof window === 'undefined') return null;
  try {
    const rawTime = localStorage.getItem(AUTOSAVE_TIME_KEY);
    return rawTime ? new Date(rawTime) : null;
  } catch {
    return null;
  }
}

/**
 * Determina si el borrador contiene datos significativos ingresados por el usuario
 */
export function hasSignificantDraftData(data: Partial<PermitData> | null | undefined): boolean {
  if (!data) return false;
  if (data.activityDescription && data.activityDescription.trim().length > 0) return true;
  if (data.permitNumber && data.permitNumber.trim() !== '' && data.permitNumber !== '001') return true;
  if (data.workers && data.workers.some(w => (w.name && w.name.trim().length > 0) || (w.docNumber && w.docNumber.trim().length > 0))) return true;
  if (data.location && data.location.trim() !== 'Bodega Central / Área de Operaciones' && data.location.trim().length > 0) return true;
  if (data.date && data.date.trim().length > 0) return true;
  if (data.observations && data.observations.trim().length > 0) return true;
  if (data.workType && data.workType.trim().length > 0) return true;
  if (data.emergencyActivator?.name || data.authorizer?.name || data.coordinator?.name) return true;
  return false;
}

/**
 * Formatea de forma amigable el tiempo transcurrido desde el último autoguardado
 */
export function formatAutoSaveTime(date: Date | null): string {
  if (!date) return 'cada 30s';
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 5) return 'hace un momento';
  if (diffSec < 60) return `hace ${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin} min`;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

