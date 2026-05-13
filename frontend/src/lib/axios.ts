// frontend/src/lib/axios.ts
import axios from 'axios';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

const api = axios.create({ baseURL: API_BASE_URL });

// ===== REFRESH TOKEN HANDLER =====
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('refreshToken');
}

function setRefreshToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem('refreshToken', token);
  else window.localStorage.removeItem('refreshToken');
}

function writeTokenToSession(token: string) {
  // Scrive il nuovo token nel sessionStorage nel formato che Zustand si aspetta
  if (typeof window === 'undefined') return;
  const tabId = window.sessionStorage.getItem('tabId');
  if (!tabId) return;
  const perTabKey = `auth-storage-${tabId}`;
  const raw = window.sessionStorage.getItem(perTabKey);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      parsed.state.token = token;
      window.sessionStorage.setItem(perTabKey, JSON.stringify(parsed));
    } catch { /* ignore */ }
  }
}

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

// Interceptor risposta: gestisce 401 con refresh token automatico
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    // Se la risposta è 401 e non abbiamo già provato a fare refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        // Nessun refresh token disponibile → logout
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Refresh in corso, metti in coda la richiesta
        return new Promise((resolve) => {
          addRefreshSubscriber((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        const newAccessToken = res.data.access_token;
        const newRefreshToken = res.data.refresh_token;

        // Salva i nuovi token
        writeTokenToSession(newAccessToken);
        if (newRefreshToken) setRefreshToken(newRefreshToken);

        // Notifica tutti i subscriber in coda
        onTokenRefreshed(newAccessToken);

        // Riprova la richiesta originale
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh fallito → pulisci token e redirect al login
        setRefreshToken(null);
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('authRememberMe');
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
export { API_BASE_URL, setRefreshToken };
