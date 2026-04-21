import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Guard per verificare i ruoli utente
 * Usato insieme a @Roles('SUPER_ADMIN', 'ADMIN', etc)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // BYPASS TOTALE: SUPER_ADMIN e FOUNDER hanno accesso a tutte le risorse del loro scope.
    // Il FOUNDER è il proprietario del negozio, può fare tutto ciò che fa un ADMIN + più.
    // Questo evita di dover aggiungere 'FOUNDER' ad ogni decorator @Roles nel codebase.
    if (user.role === 'SUPER_ADMIN' || user.role === 'FOUNDER') {
      return true;
    }

    return requiredRoles.some((role) => user.role === role);
  }
}