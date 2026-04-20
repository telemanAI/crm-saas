import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  setActiveShop: (shopId: string, newToken?: string) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
  setImpersonate: (user: User, token: string) => void;
  exitImpersonate: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      shops: [],
      activeShopId: null,
      isAuthenticated: false,
      isImpersonating: false,
      originalUser: null,
      originalToken: null,

      setAuth: (user, token, shops = []) =>
        set({
          user,
          token,
          shops,
          activeShopId: user.tenantId || shops[0]?.shopId || null,
          isAuthenticated: true,
        }),

      setActiveShop: (shopId, newToken) =>
        set((state) => ({
          activeShopId: shopId,
          token: newToken || state.token,
          user: state.user ? { ...state.user, tenantId: shopId } : null,
        })),

      clearAuth: () =>
        set({
          user: null,
          token: null,
          shops: [],
          activeShopId: null,
          isAuthenticated: false,
          isImpersonating: false,
          originalUser: null,
          originalToken: null,
        }),

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
    }
  )
);
