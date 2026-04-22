// frontend/src/hooks/usePermission.ts
import { useAuthStore } from '@/stores/authStore';

/**
 * Hook che ritorna true/false se l'utente corrente (nel negozio attivo) ha un permesso granulare.
 *
 * Regole:
 *  - SUPER_ADMIN → sempre true
 *  - FOUNDER nel negozio attivo → sempre true
 *  - ADMIN/OPERATOR → true solo se permissions[key] === true nella membership di quello shop
 *
 * Uso:
 *   const canDelete = usePermission('canDeletePractices');
 *   {canDelete && <Button onClick={handleDelete}>Elimina</Button>}
 *
 * NB: questo è UX layer. L'enforcement di sicurezza avviene sul backend (PermissionsGuard).
 */
export type PermissionKey =
  | 'canViewAllCustomers'
  | 'canViewReports'
  | 'canCreatePractices'
  | 'canDeletePractices'
  | 'canDeleteCustomers'
  | 'canExportData'
  | 'canImportData'
  | 'canManageCashRegister'
  | 'canChangeUserRoles';

export function usePermission(key: PermissionKey): boolean {
  const { user, shops, activeShopId } = useAuthStore();

  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;

  const activeShop = shops.find((s) => s.shopId === activeShopId) || shops[0];
  if (!activeShop) return false;

  if (activeShop.role === 'FOUNDER') return true;

  const perms = activeShop.permissions || {};
  return perms[key] === true;
}

/**
 * Variante che ritorna l'intero oggetto permessi dell'utente nel negozio attivo.
 * Utile quando devi fare più check in fila.
 */
export function useActivePermissions(): Record<string, boolean> {
  const { user, shops, activeShopId } = useAuthStore();
  if (!user) return {};

  const activeShop = shops.find((s) => s.shopId === activeShopId) || shops[0];
  if (!activeShop) return {};

  // FOUNDER e SUPER_ADMIN: tutto true
  if (user.role === 'SUPER_ADMIN' || activeShop.role === 'FOUNDER') {
    return {
      canViewAllCustomers: true,
      canViewReports: true,
      canCreatePractices: true,
      canDeletePractices: true,
      canDeleteCustomers: true,
      canExportData: true,
      canImportData: true,
      canManageCashRegister: true,
      canChangeUserRoles: true,
    };
  }

  return (activeShop.permissions || {}) as Record<string, boolean>;
}