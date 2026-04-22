// frontend/src/lib/api.ts
// API Configuration - URL diretto del backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Legge il token dallo storage, seguendo la stessa logica di adaptiveStorage
// in authStore.ts: prima controlla authRememberMe, poi legge dallo storage giusto.
// Fix bug: prima leggeva SEMPRE da localStorage → quando OPERATOR si logga in
// sessionStorage (remember=false) e in localStorage restava token FOUNDER
// stale, tutte le chiamate API autenticavano il FOUNDER → account swap.
function getToken(): string | null {
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
}

async function apiClient(endpoint: string, options: RequestInit = {}) {
  try {
    const token = getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };
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
      body: JSON.stringify({ email, password, subscriptionCode }),
    }),

  loginV2: (email: string, password: string, subscriptionCode?: string) =>
    apiClient('/auth/login-v2', {
      method: 'POST',
      body: JSON.stringify({ email, password, ...(subscriptionCode ? { subscriptionCode } : {}) }),
    }),

  superAdminLogin: (email: string, password: string) =>
    apiClient('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  impersonate: (tenantId: string) =>
    apiClient('/auth/impersonate', {
      method: 'POST',
      body: JSON.stringify({ tenantId }),
    }),

  register: (data: any) =>
    apiClient('/tenants/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  registerShopOwner: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    shopName: string;
    legalName: string;
    vatNumber?: string;
    slug?: string;
  }) =>
    apiClient('/auth/register-shop-owner', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  requestOtp: (email: string) =>
    apiClient('/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  verifyOtp: (email: string, code: string) =>
    apiClient('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),

  completeRegistration: (data: {
    pendingToken: string;
    role: 'shop_owner' | 'operator';
    shopName?: string;
    legalName?: string;
    vatNumber?: string;
    inviteToken?: string;
  }) =>
    apiClient('/auth/complete-registration', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  myShops: () => apiClient('/auth/my-shops'),
  switchShop: (shopId: string) =>
    apiClient('/auth/switch-shop', {
      method: 'POST',
      body: JSON.stringify({ shopId }),
    }),

  addShop: (data: {
    name: string;
    mode: 'same-company' | 'new-company';
    companyId?: string;
    legalName?: string;
    vatNumber?: string;
  }) =>
    apiClient('/auth/add-shop', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getInvite: (token: string) => apiClient(`/auth/invite/${token}`),

  googleLoginUrl: () => `${API_BASE_URL}/auth/google`,
  facebookLoginUrl: () => `${API_BASE_URL}/auth/facebook`,
};

export const invitesApi = {
  create: (data: { email: string; role: string; permissions?: any; adminNote?: string }) =>
    apiClient('/invites', { method: 'POST', body: JSON.stringify(data) }),
  list: () => apiClient('/invites'),
  resend: (id: string) => apiClient(`/invites/${id}/resend`, { method: 'POST' }),
  revoke: (id: string) => apiClient(`/invites/${id}`, { method: 'DELETE' }),
  acceptWithPassword: (token: string, data: { password: string; firstName: string; lastName: string }) =>
    apiClient(`/invites/accept/${token}/password`, { method: 'POST', body: JSON.stringify(data) }),
  acceptAuthenticated: (token: string) =>
    apiClient(`/invites/accept/${token}`, { method: 'POST' }),
};

export const membershipsApi = {
  list: () => apiClient('/memberships'),
  updatePermissions: (userId: string, permissions: any) =>
    apiClient(`/memberships/${userId}/permissions`, { method: 'PATCH', body: JSON.stringify(permissions) }),
  updateRole: (userId: string, role: string) =>
    apiClient(`/memberships/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  revoke: (userId: string, endOfRelationshipNote?: string) =>
    apiClient(`/memberships/${userId}`, {
      method: 'DELETE',
      body: JSON.stringify({ endOfRelationshipNote }),
    }),
  history: (userId: string) => apiClient(`/memberships/history/${userId}`),
};

export const companiesApi = {
  mine: () => apiClient('/companies/mine'),
  all: () => apiClient('/companies'),
  shopsOf: (id: string) => apiClient(`/companies/${id}/shops`),
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