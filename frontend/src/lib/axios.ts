// frontend/src/lib/axios.ts
import axios from 'axios';
// API URL configurabile via environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Crea istanza axios pre-configurata
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Helper per ottenere il token - segue la stessa logica di adaptiveStorage
// in authStore.ts (bug fix: prima leggeva solo localStorage causando swap di account).
const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  const remember = window.localStorage.getItem('authRememberMe') === 'true';
  const primary = remember ? window.localStorage : window.sessionStorage;
  const secondary = remember ? window.sessionStorage : window.localStorage;
  const raw = primary.getItem('auth-storage') || secondary.getItem('auth-storage');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed.state?.token || null;
  } catch {
    return null;
  }
};

// Interceptor per aggiungere automaticamente il token
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
export { API_BASE_URL };