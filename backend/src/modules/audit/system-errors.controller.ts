import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SystemErrorsService } from './system-errors.service';

/**
 * Endpoint per il monitoraggio degli errori di sistema.
 *
 *   GET /api/system-errors           → lista errori filtrabile
 *   GET /api/system-errors/health    → riepilogo salute negozi
 *
 * Solo SUPER_ADMIN (globale) o FOUNDER (limitato al proprio tenant).
 */
@Controller('system-errors')
export class SystemErrorsController {
  constructor(private readonly systemErrorsService: SystemErrorsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(
    @Req() req: any,
    @Query('tenantId') tenantId?: string,
    @Query('userId') userId?: string,
    @Query('statusCode') statusCode?: string,
    @Query('severity') severity?: 'error' | 'warning' | 'info',
    @Query('endpoint') endpoint?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const user = req.user;
    if (!user) throw new ForbiddenException('Non autenticato');

    const isSuperAdmin = user.role === 'SUPER_ADMIN' || user.isSuperAdmin;
    let effectiveTenantId = tenantId;

    if (!isSuperAdmin) {
      if (user.role !== 'FOUNDER') {
        throw new ForbiddenException(
          'Solo SUPER_ADMIN e FOUNDER possono consultare gli errori di sistema',
        );
      }
      effectiveTenantId = user.tenantId;
    }

    const { items, total } = await this.systemErrorsService.listErrors({
      tenantId: effectiveTenantId,
      userId,
      statusCode: statusCode ? parseInt(statusCode, 10) : undefined,
      severity,
      endpoint,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    return {
      total,
      items: items.map((e) => ({
        id: e.id,
        statusCode: e.statusCode,
        method: e.method,
        endpoint: e.endpoint,
        errorMessage: e.errorMessage,
        errorName: e.errorName,
        severity: e.severity,
        tenantId: e.tenantId,
        userId: e.userId,
        tenant: e.tenant
          ? {
              id: e.tenant.id,
              name: e.tenant.name,
              subscriptionCode: e.tenant.subscriptionCode,
            }
          : null,
        user: e.user
          ? {
              id: e.user.id,
              email: e.user.email,
              firstName: e.user.firstName,
              lastName: e.user.lastName,
            }
          : null,
        ipAddress: e.ipAddress,
        userAgent: e.userAgent,
        metadata: e.metadata,
        createdAt: e.createdAt,
        // Stack trace lo esponiamo solo a SUPER_ADMIN per evitare data leak
        stackTrace: isSuperAdmin ? e.stackTrace : null,
      })),
    };
  }

  /**
   * Riepilogo salute negozi — SUPER_ADMIN ONLY.
   * Per ogni tenant con errori negli ultimi 7 giorni:
   *   {tenantId, tenantName, total24h, total7d, errors24h, warnings24h,
   *    lastErrorAt, topEndpoints[]}
   */
  @Get('health')
  @UseGuards(JwtAuthGuard)
  async health(@Req() req: any) {
    const user = req.user;
    if (!user) throw new ForbiddenException('Non autenticato');
    const isSuperAdmin = user.role === 'SUPER_ADMIN' || user.isSuperAdmin;
    if (!isSuperAdmin) {
      throw new ForbiddenException(
        'Solo il SUPER_ADMIN può vedere il riepilogo salute di tutti i negozi',
      );
    }
    return this.systemErrorsService.getShopsHealth();
  }
}
