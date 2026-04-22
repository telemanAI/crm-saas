// frontend/src/stores/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Storage adattivo: se "authRememberMe" vale "true" usa localStorage
 * (sessione persistente), altrimenti sessionStorage (si cancella alla
 * chiusura del browser/tab). setItem scrive sul primario e pulisce il
 * secondario per evitare residui che causavano account swap.
 */
const adaptiveStorage = {
  getItem: (name: string) => {
    if (typeof window === 'undefined') return null;
    const remember = window.localStorage.getItem('authRememberMe') === 'true';
    const store = remember ? window.localStorage : window.sessionStorage;
    return store.getItem(name);
  },
  setItem: (name: string, value: string) => {
    if (typeof window === 'undefined') return;
    const remember = window.localStorage.getItem('authRememberMe') === 'true';
    const primary = remember ? window.localStorage : window.sessionStorage;
    const secondary = remember ? window.sessionStorage : window.localStorage;
    primary.setItem(name, value);
    secondary.removeItem(name);
  },
  removeItem: (name: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(name);
    window.sessionStorage.removeItem(name);
  },
};

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'FOUNDER' | 'OPERATOR';
  tenantId?: string;
  isActive?: boolean;
  isImpersonated?: boolean;
  avatarUrl?: string;
}

export interface ShopMembership {
  shopId: string;
  name: string;
  subscriptionCode: string;
  role: 'FOUNDER' | 'ADMIN' | 'OPERATOR';
  permissions: Record<string, boolean>;
  companyId?: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  shops: ShopMembership[];
  activeShopId: string | null;
  isAuthenticated: boolean;
  isImpersonating: boolean;
  originalUser: User | null;
  originalToken: string | null;
  setAuth: (user: User, token: string, shops?: ShopMembership[]) => void;
  /**
   * Cambia lo shop attivo.
   *
   * CONTRATTO FONDAMENTALE: il newToken è OBBLIGATORIO per mantenere
   * JWT.tenantId === activeShopId. Se chiami questo metodo senza un
   * token fresco rilasciato dal backend (endpoint /auth/switch-shop),
   * il PermissionsGuard controllerà i permessi di un negozio diverso
   * da quello che l'UI mostra → account swap.
   *
   * Il parametro è formalmente opzionale per retrocompat, ma se mancante
   * logghiamo un warning e rifiutiamo il cambio.
   */
  setActiveShop: (shopId: string, newToken?: string, newUser?: User) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
  setImpersonate: (user: User, token: string) => void;
  exitImpersonate: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      shops: [],
      activeShopId: null,
      isAuthenticated: false,
      isImpersonating: false,
      originalUser: null,
      originalToken: null,

      setAuth: (user, token, shops = []) => {
        // Se il backend ha passato una lista shops, usiamo il primo (o
        // l'attuale user.tenantId se incluso nei shops) come activeShopId.
        // Questo allinea JWT.tenantId con il concetto di negozio attivo.
        const activeShopId =
          shops.find((s) => s.shopId === user.tenantId)?.shopId ||
          user.tenantId ||
          shops[0]?.shopId ||
          null;

        // Sincronizza user.role con il ruolo che ha nello shop attivo
        // (per utenti multi-shop con ruoli diversi). SUPER_ADMIN resta invariato.
        let effectiveUser = user;
        if (user.role !== 'SUPER_ADMIN') {
          const activeShop = shops.find((s) => s.shopId === activeShopId);
          if (activeShop) {
            effectiveUser = { ...user, role: activeShop.role, tenantId: activeShopId || undefined };
          }
        }

        set({
          user: effectiveUser,
          token,
          shops,
          activeShopId,
          isAuthenticated: true,
        });
      },

      setActiveShop: (shopId, newToken, newUser) => {
        const state = get();
        if (!newToken) {
          // Bloccante: cambiare shopId senza emettere un nuovo JWT porta
          // inevitabilmente ad account swap. Meglio fallire esplicitamente.
          console.warn(
            '[authStore] setActiveShop chiamato senza newToken: rifiuto per sicurezza ' +
              '(richiedi prima il nuovo JWT a /auth/switch-shop).',
          );
          return;
        }

        // Ricaviamo il ruolo dal membership dello shop selezionato così che
        // user.role sia sempre coerente con la membership attiva.
        const selected = state.shops.find((s) => s.shopId === shopId);
        const nextRole = newUser?.role || selected?.role || state.user?.role;

        set({
          activeShopId: shopId,
          token: newToken,
          user: state.user
            ? {
                ...state.user,
                ...(newUser || {}),
                tenantId: shopId,
                role: (nextRole as User['role']) || state.user.role,
              }
            : null,
        });
      },

      clearAuth: () => {
        if (typeof window !== 'undefined') {
          // Pulizia completa: entrambi gli storage + flag remember.
          window.localStorage.removeItem('authRememberMe');
          window.localStorage.removeItem('auth-storage');
          window.sessionStorage.removeItem('auth-storage');
        }
        set({
          user: null,
          token: null,
          shops: [],
          activeShopId: null,
          isAuthenticated: false,
          isImpersonating: false,
          originalUser: null,
          originalToken: null,
        });
      },

      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),

      setImpersonate: (user, token) =>
        set((state) => ({
          user,
          token,
          isAuthenticated: true,
          isImpersonating: true,
          originalUser: state.user,
          originalToken: state.token,
        })),

      exitImpersonate: () =>
        set((state) => ({
          user: state.originalUser,
          token: state.originalToken,
          isAuthenticated: true,
          isImpersonating: false,
          originalUser: null,
          originalToken: null,
        })),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => adaptiveStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        shops: state.shops,
        activeShopId: state.activeShopId,
        isAuthenticated: state.isAuthenticated,
        isImpersonating: state.isImpersonating,
        originalUser: state.originalUser,
        originalToken: state.originalToken,
      }),
    },
  ),
);
