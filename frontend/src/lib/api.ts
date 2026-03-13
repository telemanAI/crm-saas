// API Configuration - URL diretto del backend
const API_BASE_URL = 'http://localhost:3001/api';

// Legge il token dallo storage locale
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const storage = localStorage.getItem('auth-storage');
  if (!storage) return null;
  try {
    const parsed = JSON.parse(storage);
    return parsed.state?.token || null;
  } catch {
    return null;
  }
}

async function apiClient(endpoint: string, options: RequestInit = {}) {
  try {
    const token = getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };
    
    // Aggiunge automaticamente il token se presente
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers,
      ...options,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Errore ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    if (error.message === 'Failed to fetch') {
      throw new Error('Impossibile connettersi al server. Verifica che il backend sia in esecuzione.');
    }
    throw error;
  }
}

export const authApi = {
  login: (email: string, password: string, subscriptionCode?: string) =>
    apiClient('/auth/login', { 
      method: 'POST', 
      body: JSON.stringify({ email, password, subscriptionCode }) 
    }),
  superAdminLogin: (email: string, password: string) =>
    apiClient('/auth/admin/login', { 
      method: 'POST', 
      body: JSON.stringify({ email, password }) 
    }),
  // ✅ AGGIUNTO: impersonate per entrare nel CRM del negozio
  impersonate: (tenantId: string) =>
    apiClient('/auth/impersonate', { 
      method: 'POST', 
      body: JSON.stringify({ tenantId }) 
    }),
  register: (data: any) =>
    apiClient('/tenants/register', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    }),
};

export const customersAPI = { 
  getAll: () => apiClient('/customers'),
  getById: (id: string) => apiClient(`/customers/${id}`),
  create: (data: any) => apiClient('/customers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiClient(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiClient(`/customers/${id}`, { method: 'DELETE' }),
};

export const practicesAPI = { 
  getAll: () => apiClient('/practices'),
  getById: (id: string) => apiClient(`/practices/${id}`),
  create: (data: any) => apiClient('/practices', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiClient(`/practices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiClient(`/practices/${id}`, { method: 'DELETE' }),
};

export const usersAPI = { 
  getAll: () => apiClient('/users'),
  getById: (id: string) => apiClient(`/users/${id}`),
  create: (data: any) => apiClient('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiClient(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiClient(`/users/${id}`, { method: 'DELETE' }),
};

export default apiClient;