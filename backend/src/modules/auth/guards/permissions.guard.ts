// backend/src/modules/auth/guards/permissions.guard.ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MembershipsService } from '../../memberships/memberships.service';
import { MembershipPermissions } from '../../memberships/entities/user-shop-membership.entity';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger('PermissionsGuard');

  constructor(
    private readonly reflector: Reflector,
    private readonly membershipsService: MembershipsService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
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
    if (!user) {
      this.logger.warn(`[${required}] BLOCK: req.user è undefined (JwtAuthGuard non ha popolato)`);
      throw new ForbiddenException('Non autenticato');
    }

    if (user.role === 'SUPER_ADMIN' || user.isSuperAdmin) {
      this.logger.log(`[${required}] ALLOW: SUPER_ADMIN bypass (user=${user.email})`);
      return true;
    }

    const shopId = user.tenantId;
    if (!shopId) {
      this.logger.warn(`[${required}] BLOCK: shopId (tenantId) mancante nel JWT per user=${user.email}`);
      throw new ForbiddenException('Nessuno shop attivo');
    }

    const userId = user.id || user.sub || user.userId;
    const membership = await this.membershipsService.findActiveForUserAndShop(userId, shopId);
    if (!membership) {
      this.logger.warn(`[${required}] BLOCK: nessuna membership attiva user=${userId} shop=${shopId}`);
      throw new ForbiddenException('Nessuna membership attiva in questo negozio');
    }

    if (membership.role === 'FOUNDER') {
      this.logger.log(`[${required}] ALLOW: FOUNDER bypass (user=${user.email} shop=${shopId})`);
      return true;
    }

    const permissions = (membership.permissions || {}) as MembershipPermissions;
    this.logger.log(
      `[${required}] CHECK: user=${user.email} role=${membership.role} shop=${shopId} permissions=${JSON.stringify(permissions)}`,
    );

    if (permissions[required] === true) {
      this.logger.log(`[${required}] ALLOW: permesso concesso`);
      return true;
    }

    this.logger.warn(`[${required}] BLOCK: permesso mancante (valore=${permissions[required]})`);
    throw new ForbiddenException(`Permesso mancante: ${required}`);
  }
}