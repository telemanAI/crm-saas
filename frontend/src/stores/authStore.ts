// frontend/src/stores/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Phase E — Multi-tab session isolation
 * --------------------------------------
 * PROBLEMA: con la versione precedente, aprire 2 tab con account diversi
 * causava account swap: la key `auth-storage` su localStorage è condivisa
 * tra tab, quindi l'ultimo login vinceva e tab1 si ritrovava loggata
 * con l'utente di tab2 dopo qualunque refresh.
 *
 * SOLUZIONE: isolamento per tab tramite `tabId` univoco salvato in
 * sessionStorage (sessionStorage è nativamente isolato per tab/finestra).
 *
 * Schema storage:
 *   - sessionStorage[`auth-storage-${tabId}`]  → sessione attiva di QUESTA tab (sempre)
 *   - localStorage[`auth-storage-master`]      → backup "remember me" cross-tab (solo se richiesto)
 *
 * Workflow:
 *   1. Boot: leggi `tabId` da sessionStorage; se manca generane uno nuovo.
 *   2. Login: scrivi su sessionStorage(per-tab); se "remember me" attivo,
 *      copia anche su localStorage(master).
 *   3. Refresh / nuova tab vuota: prova prima sessionStorage(per-tab);
 *      se vuoto E localStorage(master) presente → ripristina da master
 *      (utente vede ancora il login senza dover ridigitare).
 *   4. Logout esplicito: pulisci ENTRAMBI gli storage (esce da ogni tab e dispositivo).
 *
 * Risultato: due tab con account A e B coesistono senza interferenze;
 * chi rinfresca la tab vede sempre il proprio account.
 */

const TAB_ID_KEY = 'tabId';
const MASTER_KEY = 'auth-storage-master';
const REMEMBER_FLAG = 'authRememberMe';

function generateTabId(): string {
  // UUID v4 lite (non serve crypto.randomUUID polyfill server-side)
  return 'tab-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

function getTabId(): string {
  if (typeof window === 'undefined') return 'ssr';
  let id = window.sessionStorage.getItem(TAB_ID_KEY);
  if (!id) {
    id = generateTabId();
    window.sessionStorage.setItem(TAB_ID_KEY, id);
  }
  return id;
}

const tabStorage = {
  getItem: (_name: string) => {
    if (typeof window === 'undefined') return null;
    const tabId = getTabId();
    const perTabKey = `auth-storage-${tabId}`;
    // 1) prova prima la chiave per-tab
    const fromTab = window.sessionStorage.getItem(perTabKey);
    if (fromTab) return fromTab;

    // 2) se la tab è "vuota" (es. appena aperta) ma c'è un master "remember me"
    //    su localStorage → ripristina la sessione da lì SOLO per questa tab.
    const remember = window.localStorage.getItem(REMEMBER_FLAG) === 'true';
    if (remember) {
      const master = window.localStorage.getItem(MASTER_KEY);
      if (master) {
        // Cache anche su sessionStorage così le successive operazioni di
        // questa tab non rileggono il master (e non si confondono con
        // un'altra tab che intanto fa login con account diverso).
        window.sessionStorage.setItem(perTabKey, master);
        return master;
      }
    }
    return null;
  },
  setItem: (_name: string, value: string) => {
    if (typeof window === 'undefined') return;
    const tabId = getTabId();
    const perTabKey = `auth-storage-${tabId}`;
    // 1) sempre scrivi su sessionStorage(per-tab) → isolato dagli altri tab
    window.sessionStorage.setItem(perTabKey, value);

    // 2) se "remember me" è attivo, scrivi anche sul master (per ripristino
    //    su NUOVE tab/restart browser). Altrimenti rimuovi il master per
    //    sicurezza (l'utente non vuole sessione persistente).
    const remember = window.localStorage.getItem(REMEMBER_FLAG) === 'true';
    if (remember) {
      window.localStorage.setItem(MASTER_KEY, value);
    } else {
      window.localStorage.removeItem(MASTER_KEY);
    }
  },
  removeItem: (_name: string) => {
    if (typeof window === 'undefined') return;
    const tabId = getTabId();
    const perTabKey = `auth-storage-${tabId}`;
    window.sessionStorage.removeItem(perTabKey);
    // Logout esplicito: invalida anche il master così le altre tab/device
    // perdono accesso al prossimo refresh.
    window.localStorage.removeItem(MASTER_KEY);
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
          // eslint-disable-next-line no-console
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
          // Phase E — pulizia completa: tab corrente + master cross-tab.
          // (Le altre tab perderanno accesso al primo refresh — desiderato
          //  perché l'utente ha fatto logout esplicito).
          window.localStorage.removeItem(REMEMBER_FLAG);
          window.localStorage.removeItem(MASTER_KEY);
          // Pulisci anche eventuali residui delle vecchie key (compat retro)
          window.localStorage.removeItem('auth-storage');
          window.sessionStorage.removeItem('auth-storage');
          // Pulisci la chiave per-tab corrente
          const tabId = getTabId();
          window.sessionStorage.removeItem(`auth-storage-${tabId}`);
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
      // Phase E — il "name" qui è solo un'etichetta interna del middleware
      // persist; la chiave reale di storage è gestita da `tabStorage` con
      // prefisso `auth-storage-${tabId}` per garantire isolamento per-tab.
      name: 'auth-storage',
      storage: createJSONStorage(() => tabStorage),
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
