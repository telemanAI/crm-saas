import { SetMetadata } from '@nestjs/common';
import { MembershipPermissions } from '../../memberships/entities/user-shop-membership.entity';

export const PERMISSION_KEY = 'requiredPermission';

/**
 * Decorator per richiedere un permesso specifico sulla membership attiva dell'utente.
 * - SUPER_ADMIN bypassa sempre.
 * - FOUNDER bypassa sempre (è il creatore del negozio).
 * - ADMIN/OPERATOR devono avere il permesso esplicitamente true.
 *
 * Uso:
 *   @UseGuards(JwtAuthGuard, PermissionsGuard)
 *   @RequirePermission('canDeletePractices')
 *   @Delete(':id')
 *   async delete(...) { ... }
 */
export const RequirePermission = (permission: keyof MembershipPermissions) =>
  SetMetadata(PERMISSION_KEY, permission);
