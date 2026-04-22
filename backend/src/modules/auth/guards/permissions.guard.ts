import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MembershipsService } from '../../memberships/memberships.service';
import { MembershipPermissions } from '../../memberships/entities/user-shop-membership.entity';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly membershipsService: MembershipsService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    // Safety: se endpoint pubblico, non controllare nulla
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      'isPublic',
      [ctx.getHandler(), ctx.getClass()],
    );
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<keyof MembershipPermissions>(
      PERMISSION_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!required) return true;

    const req = ctx.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new ForbiddenException('Non autenticato');

    // SUPER_ADMIN e impersonation bypass
    if (user.role === 'SUPER_ADMIN' || user.isSuperAdmin) return true;

    const shopId = user.tenantId;
    if (!shopId) throw new ForbiddenException('Nessuno shop attivo');

    const membership = await this.membershipsService.findActiveForUserAndShop(user.id || user.sub, shopId);
    if (!membership) throw new ForbiddenException('Nessuna membership attiva in questo negozio');

    // FOUNDER bypass sempre
    if (membership.role === 'FOUNDER') return true;

    const permissions = (membership.permissions || {}) as MembershipPermissions;
    if (permissions[required] === true) return true;

    throw new ForbiddenException(`Permesso mancante: ${required}`);
  }
}
