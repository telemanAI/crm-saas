// frontend/src/lib/api.ts
// API Configuration - URL diretto del backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

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
 * Senza questa logica, dopo il deploy di Phase E le chiamate fatte tramite
 * `apiClient` (fetch) NON trovavano più il token e tornavano 401 (es. il
 * 401 su /auth/switch-shop visto in produzione).
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

function getToken(): string | null {
  if (typeof window === 'undefined') return null;

  // 1) Phase E: per-tab key (sessionStorage isolato per scheda)
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

  // 3) Legacy fallback (utenti loggati prima della Phase E)
  const legacyS = readTokenFromRaw(window.sessionStorage.getItem('auth-storage'));
  if (legacyS) return legacyS;
  const legacyL = readTokenFromRaw(window.localStorage.getItem('auth-storage'));
  if (legacyL) return legacyL;

  return null;
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

  /** Endpoint diagnostico per SUPER_ADMIN e FOUNDER */
  debug: () => apiClient('/auth/debug'),

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

export const auditApi = {
  list: (params?: {
    tenantId?: string;
    userId?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }) => {
    const qs = params
      ? '?' +
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join('&')
      : '';
    return apiClient(`/audit-logs${qs}`);
  },
};

export const systemErrorsApi = {
  list: (params?: {
    tenantId?: string;
    userId?: string;
    statusCode?: number;
    severity?: 'error' | 'warning' | 'info';
    endpoint?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }) => {
    const qs = params
      ? '?' +
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join('&')
      : '';
    return apiClient(`/system-errors${qs}`);
  },
  /** Riepilogo salute per tenant - SUPER_ADMIN ONLY */
  health: () => apiClient('/system-errors/health'),
};

export default apiClient;
