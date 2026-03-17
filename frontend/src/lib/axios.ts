import api from '@/lib/axios';

// API URL configurabile via environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Crea istanza axios pre-configurata
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Helper per ottenere il token
const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  const storage = localStorage.getItem('auth-storage');
  if (!storage) return null;
  try {
    const parsed = JSON.parse(storage);
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
