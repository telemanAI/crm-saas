// frontend/src/lib/axios.ts
import axios from 'axios';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

const api = axios.create({ baseURL: API_BASE_URL });

/**
 * Lettura token compatibile con Phase E (tabId-prefixed sessionStorage)
 * + fallback master localStorage + legacy `auth-storage` (per non rompere
 * eventuali sessioni residue di utenti loggati prima della Phase E).
 *
 * Ordine di lookup:
 *   1) sessionStorage[`auth-storage-${tabId}`]   ← tab corrente (Phase E)
 *   2) localStorage[`auth-storage-master`]        ← remember-me cross-tab (Phase E)
 *   3) sessionStorage[`auth-storage`]             ← legacy session
 *   4) localStorage[`auth-storage`]               ← legacy persisted
 *
 * Tutti i payload Zustand hanno la forma `{ state: { token: string }, version: ... }`.
 */
function readTokenFromRaw(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed?.state?.token || null;
  } catch {
    return null;
  }
}

const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;

  // 1) Phase E: per-tab key
  const tabId = window.sessionStorage.getItem('tabId');
  if (tabId) {
    const t = readTokenFromRaw(window.sessionStorage.getItem(`auth-storage-${tabId}`));
    if (t) return t;
  }

  // 2) Phase E: master remember-me
  const remember = window.localStorage.getItem('authRememberMe') === 'true';
  if (remember) {
    const t = readTokenFromRaw(window.localStorage.getItem('auth-storage-master'));
    if (t) return t;
  }

  // 3) Legacy fallback (pre-Phase E)
  const legacyS = readTokenFromRaw(window.sessionStorage.getItem('auth-storage'));
  if (legacyS) return legacyS;
  const legacyL = readTokenFromRaw(window.localStorage.getItem('auth-storage'));
  if (legacyL) return legacyL;

  return null;
};

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
export { API_BASE_URL };
