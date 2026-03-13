import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR';
  tenantId?: string;
  isActive: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isImpersonating: boolean;
  originalUser: User | null;
  originalToken: string | null;
  setAuth: (user: User, token: string) => void;
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
      isAuthenticated: false,
      isImpersonating: false,
      originalUser: null,
      originalToken: null,

      setAuth: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: true,
        }),

      clearAuth: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isImpersonating: false,
          originalUser: null,
          originalToken: null,
        }),

      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),

      // ✅ ENTRA nel CRM del negozio (impersona l'admin)
      setImpersonate: (user, token) =>
        set((state) => ({
          user,
          token,
          isAuthenticated: true,
          isImpersonating: true,
          originalUser: state.user,
          originalToken: state.token,
        })),

      // ✅ TORNA al SuperAdmin
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
        isAuthenticated: state.isAuthenticated,
        isImpersonating: state.isImpersonating,
        originalUser: state.originalUser,
        originalToken: state.originalToken,
      }),
    }
  )
);