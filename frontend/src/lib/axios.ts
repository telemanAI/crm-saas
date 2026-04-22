// frontend/src/lib/axios.ts
import axios from 'axios';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

const api = axios.create({ baseURL: API_BASE_URL });

/**
 * Lettura token STRETTAMENTE conforme a adaptiveStorage in authStore.ts.
 * Niente fallback tra localStorage e sessionStorage: legge SOLO lo storage
 * selezionato da authRememberMe. Questo previene il bug di account swap dove
 * un token stale residuo nell'altro storage rubava la sessione.
 */
const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  const remember = window.localStorage.getItem('authRememberMe') === 'true';
  const store = remember ? window.localStorage : window.sessionStorage;
  const raw = store.getItem('auth-storage');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed.state?.token || null;
  } catch {
    return null;
  }
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
