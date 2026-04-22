import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditService } from './audit.service';

/**
 * Endpoint di lettura audit logs.
 *
 *  - SUPER_ADMIN: può filtrare qualsiasi tenantId (o nessuno = tutti).
 *  - FOUNDER: può leggere solo gli audit del proprio tenantId attivo.
 *  - Altri ruoli (ADMIN/OPERATOR): bloccati di default.
 *
 * Filtri disponibili: tenantId, userId, entityType, entityId, action,
 * from (ISO), to (ISO), limit (<=500), offset.
 */
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(
    @Req() req: any,
    @Query('tenantId') tenantId?: string,
    @Query('userId') userId?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const user = req.user;
    if (!user) throw new ForbiddenException('Non autenticato');

    const isSuperAdmin = user.role === 'SUPER_ADMIN' || user.isSuperAdmin;

    // I FOUNDER sono forzati al proprio tenant anche se provano a passarne un altro.
    let effectiveTenantId = tenantId;
    if (!isSuperAdmin) {
      if (user.role !== 'FOUNDER') {
        throw new ForbiddenException(
          'Solo SUPER_ADMIN e FOUNDER possono consultare gli audit logs',
        );
      }
      if (!user.tenantId) {
        throw new BadRequestException('Nessuno shop attivo nel token');
      }
      effectiveTenantId = user.tenantId;
    }

    const { items, total } = await this.auditService.listLogs({
      tenantId: effectiveTenantId,
      userId,
      entityType,
      entityId,
      action,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    return {
      total,
      items: items.map((l) => ({
        id: l.id,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        tenantId: l.tenantId,
        userId: l.userId,
        user: l.user
          ? {
              id: l.user.id,
              email: l.user.email,
              firstName: l.user.firstName,
              lastName: l.user.lastName,
            }
          : null,
        tenant: l.tenant
          ? {
              id: l.tenant.id,
              name: l.tenant.name,
              subscriptionCode: l.tenant.subscriptionCode,
            }
          : null,
        oldValues: l.oldValues,
        newValues: l.newValues,
        metadata: l.metadata,
        createdAt: l.createdAt,
      })),
    };
  }
}
