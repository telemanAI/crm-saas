import { SetMetadata } from '@nestjs/common';

/**
 * Decorator per specificare i ruoli autorizzati
 * Uso: @Roles('SUPER_ADMIN', 'ADMIN')
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);