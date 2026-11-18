export const DEFAULT_ACCESS_CODE = 'ALEXANDER1991';

const ACCESS_CODE_KEY = 'permit_work_heights_access_code';
const AUTH_SESSION_KEY = 'permit_work_heights_auth_session';
const AUTH_REMEMBER_KEY = 'permit_work_heights_auth_remember';

export function getStoredAccessCode(): string {
  if (typeof window === 'undefined') return DEFAULT_ACCESS_CODE;
  try {
    const stored = localStorage.getItem(ACCESS_CODE_KEY);
    return stored && stored.trim().length > 0 ? stored : DEFAULT_ACCESS_CODE;
  } catch {
    return DEFAULT_ACCESS_CODE;
  }
}

export function saveAccessCode(newCode: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const trimmed = newCode.trim();
    if (!trimmed) return false;
    localStorage.setItem(ACCESS_CODE_KEY, trimmed);
    return true;
  } catch {
    return false;
  }
}

export function resetToDefaultAccessCode(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACCESS_CODE_KEY, DEFAULT_ACCESS_CODE);
  } catch {
    // Ignore storage errors
  }
}

export function checkIsAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const sessionAuth = sessionStorage.getItem(AUTH_SESSION_KEY) === 'true';
    const rememberAuth = localStorage.getItem(AUTH_REMEMBER_KEY) === 'true';
    return sessionAuth || rememberAuth;
  } catch {
    return false;
  }
}

export function setAuthenticated(remember: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
    if (remember) {
      localStorage.setItem(AUTH_REMEMBER_KEY, 'true');
    } else {
      localStorage.removeItem(AUTH_REMEMBER_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function lockApp(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem(AUTH_REMEMBER_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function isUsingDefaultCode(): boolean {
  return getStoredAccessCode() === DEFAULT_ACCESS_CODE;
}
