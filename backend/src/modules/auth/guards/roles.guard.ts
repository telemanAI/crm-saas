import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) return true;  // Nessun ruolo richiesto = accesso libero
    
    const { user } = context.switchToHttp().getRequest();
    
    // Se non c'è l'utente, non autorizzare
    if (!user) {
      throw new UnauthorizedException('Utente non autenticato');
    }
    
    // Super Admin può tutto
    if (user.isSuperAdmin || user.role === 'SUPER_ADMIN') return true;
    
    return requiredRoles.includes(user.role);
  }
}
