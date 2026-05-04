import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CompetitionsService } from './services/competitions.service';
import { CompetitionEntriesService } from './services/competition-entries.service';
import { CompetitionsAutoMonthlyService } from './services/competitions-auto-monthly.service';
import {
  CreateCompetitionDto,
  UpdateCompetitionDto,
  CopyCompetitionDto,
} from './dto/competition.dto';
import { MembershipsService } from '../memberships/memberships.service';
import { Offer } from '../offers/entities/offer.entity';
import { Tenant } from '../tenants/entities/tenant.entity';

/**
 * Endpoint Gare (TAPPA 3.1):
 *  GET    /competitions                       → lista gare visibili (filtra hidden + scope company)
 *  POST   /competitions                       → crea gara (auto-recompute retroattivo)
 *  GET    /competitions/:id                   → dettaglio + targets + prizes
 *  PATCH  /competitions/:id                   → aggiorna (auto-recompute)
 *  DELETE /competitions/:id                   → elimina + tutte le entries
 *  POST   /competitions/:id/copy              → copia su altro shop
 *  POST   /competitions/:id/recompute         → ricalcola entries scansionando il periodo
 *  GET    /competitions/:id/leaderboard       → classifica
 *  GET    /competitions/offers-options/:cat   → dropdown offerte per modale gara
 *  POST   /competitions/auto-monthly/run      → genera gara mensile auto
 */
@Controller('competitions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CompetitionsController {
  constructor(
    private readonly competitionsService: CompetitionsService,
    private readonly entriesService: CompetitionEntriesService,
    private readonly autoMonthlyService: CompetitionsAutoMonthlyService,
    private readonly membershipsService: MembershipsService,
    @InjectRepository(Offer) private readonly offerRepo: Repository<Offer>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
  ) {}

  @Get()
  @RequirePermission('canViewCompetitions')
  async list(@Req() req: any, @Query('includeInactive') includeInactive?: string) {
    const tenant = await this.tenantRepo.findOne({ where: { id: req.user.tenantId } });
    const isFounder = req.user.role === 'SUPER_ADMIN' || req.user.role === 'FOUNDER';
    return this.competitionsService.findAll(req.user.tenantId, includeInactive === 'true', {
      companyId: tenant?.companyId ?? null,
      isFounder,
    });
  }

  @Post()
  @RequirePermission('canManageCompetitions')
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: any, @Body() dto: CreateCompetitionDto) {
    const userId = req.user.id || req.user.sub || req.user.userId;
    return this.competitionsService.create(req.user.tenantId, userId, dto);
  }

  /**
   * IMPORTANTE: queste rotte specifiche DEVONO stare prima di `:id`.
   */
  @Post('auto-monthly/run')
  @RequirePermission('canManageCompetitions')
  @HttpCode(HttpStatus.OK)
  runAutoMonthly(@Body() body?: { date?: string }) {
    const ref = body?.date ? new Date(body.date) : new Date();
    return this.autoMonthlyService.ensureMonthCompetitions(ref);
  }

  /**
   * TAPPA 3.1 — Dropdown offerte per modale gara.
   * Restituisce offers raggruppate per provider (per category fixed_line/mobile/energy).
   */
  @Get('offers-options/:category')
  @RequirePermission('canViewCompetitions')
  async offersOptions(@Param('category') category: string) {
    const cat = category.toUpperCase();
    const offers = await this.offerRepo.find({
      where: { category: cat as any, is_active: true } as any,
      order: { provider: 'ASC', name: 'ASC' },
    });
    const grouped: Record<string, Array<{ id: string; name: string; canone: string; type: string }>> = {};
    const providers = new Set<string>();
    for (const o of offers) {
      if (!o.provider) continue;
      providers.add(o.provider);
      if (!grouped[o.provider]) grouped[o.provider] = [];
      grouped[o.provider].push({
        id: o.id,
        name: o.name,
        canone: o.canone || '',
        type: (o as any).type || '',
      });
    }
    return {
      providers: Array.from(providers).sort(),
      grouped,
    };
  }

  @Get(':id')
  @RequirePermission('canViewCompetitions')
  getOne(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.competitionsService.findOne(req.user.tenantId, id);
  }

  @Get(':id/leaderboard')
  @RequirePermission('canViewCompetitions')
  leaderboard(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.competitionsService.getLeaderboard(req.user.tenantId, id);
  }

  /**
   * TAPPA 3.1 — Ricalcolo manuale entries.
   * Cancella tutte le entries della gara e ri-scansiona pratiche del periodo.
   */
  @Post(':id/recompute')
  @RequirePermission('canManageCompetitions')
  @HttpCode(HttpStatus.OK)
  async recompute(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    // Verifica accesso
    await this.competitionsService.findOne(req.user.tenantId, id);
    const result = await this.entriesService.recomputeCompetition(id);
    return {
      message: 'Ricalcolo completato',
      deleted: result.deleted,
      inserted: result.inserted,
      perTarget: result.perTarget,
    };
  }

  /**
   * Phase G — Endpoint diagnostico (Phase G.3: utilizzato dalla pagina SUPER_ADMIN).
   * Spiega esattamente perché una gara non avanza: lista pratiche del periodo,
   * motivo di esclusione di ognuna, match per target, conteggio entries.
   *
   * Per SUPER_ADMIN salta il check `tenantId` (può diagnosticare gare di qualsiasi shop).
   */
  @Get(':id/diagnose')
  @RequirePermission('canManageCompetitions')
  @HttpCode(HttpStatus.OK)
  async diagnose(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    if (!req.user?.isSuperAdmin && req.user?.role !== 'SUPER_ADMIN') {
      // Founder/Admin shop: deve essere una gara visibile dal suo tenant
      await this.competitionsService.findOne(req.user.tenantId, id);
    }
    return this.entriesService.diagnoseCompetition(id);
  }

  /**
   * Phase G.2 — Monitor mensile aggregato per la sidebar/dashboard.
   * Ritorna un riepilogo dello shop attivo per il MESE CORRENTE:
   *   - totale pratiche elaborate (ACTIVATED) del mese, breakdown per categoria
   *   - per ogni gara in corso: total entries, sum target_pieces, top 3 venditori
   * Indipendente dalle gare ("la gara prescinde dal monitor delle pratiche").
   */
  @Get('monthly-overview')
  @HttpCode(HttpStatus.OK)
  async monthlyOverview(@Req() req: any, @Query('top') top?: string) {
    if (!req.user?.tenantId) {
      return {
        practicesActivatedThisMonth: 0,
        byCategory: {},
        activeCompetitions: [],
        monthLabel: '',
      };
    }
    const topN = top ? Math.max(1, Math.min(50, parseInt(top, 10) || 3)) : 3;
    // Solo founder/admin/super_admin vedono le gare nascoste (isHidden=true)
    const role = req.user?.role || '';
    const viewerCanSeeHidden =
      role === 'SUPER_ADMIN' || role === 'FOUNDER' || role === 'ADMIN';
    return this.entriesService.monthlyOverview(req.user.tenantId, topN, viewerCanSeeHidden);
  }

  @Patch(':id')
  @RequirePermission('canManageCompetitions')
  update(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompetitionDto,
  ) {
    return this.competitionsService.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('canManageCompetitions')
  @HttpCode(HttpStatus.OK)
  remove(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.competitionsService.remove(req.user.tenantId, id);
  }

  @Post(':id/copy')
  @RequirePermission('canManageCompetitions')
  @HttpCode(HttpStatus.CREATED)
  async copy(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CopyCompetitionDto,
  ) {
    const userId = req.user.id || req.user.sub || req.user.userId;
    return this.competitionsService.copyToShop(req.user.tenantId, id, userId, dto, async () => {
      const targetMembership = await this.membershipsService.findActiveForUserAndShop(
        userId,
        dto.targetShopId,
      );
      if (!targetMembership) return false;
      if (targetMembership.role === 'FOUNDER') return true;
      const perms = (targetMembership.permissions || {}) as any;
      return perms.canManageCompetitions === true;
    });
  }
}
