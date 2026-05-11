import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { PiecesReportService } from './pieces-report.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../tenants/entities/tenant.entity';

/**
 * TAPPA 3.1 — Endpoint Report Pezzi.
 *
 * GET  /reports/pieces        — report mensile completo (filtri: scope, category, provider, operatorId, from, to)
 * GET  /reports/pieces/me     — solo i miei pezzi del mese (per widget dashboard)
 *
 * Permesso: `canViewReports`. SUPER_ADMIN/FOUNDER hanno bypass come sempre.
 */
@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PiecesReportController {
  constructor(
    private readonly service: PiecesReportService,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  @Get('pieces')
  @RequirePermission('canViewReports')
  async getPieces(
    @Req() req: any,
    @Query('scope') scope?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('category') category?: string,
    @Query('provider') provider?: string,
    @Query('operatorId') operatorId?: string,
    @Query('statuses') statuses?: string,
    @Query('includePractices') includePractices?: string,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) throw new BadRequestException('Nessuno shop attivo');
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const sc: 'shop' | 'company' = scope === 'company' ? 'company' : 'shop';
    return this.service.getPieces({
      scope: sc,
      tenantId,
      companyId: tenant?.companyId ?? null,
      from,
      to,
      category,
      provider,
      operatorId,
      statuses,
      includePractices: includePractices === 'true' || includePractices === '1',
    });
  }

  @Get('pieces/me')
  async getMine(@Req() req: any, @Query('includePractices') includePractices?: string) {
    const userId = req.user.id || req.user.sub;
    const tenantId = req.user.tenantId;
    if (!tenantId) throw new BadRequestException('Nessuno shop attivo');
    return this.service.getMyPieces(userId, tenantId, includePractices === 'true');
  }
}
