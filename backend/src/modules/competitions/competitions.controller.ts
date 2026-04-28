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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CompetitionsService } from './services/competitions.service';
import { CompetitionsAutoMonthlyService } from './services/competitions-auto-monthly.service';
import {
  CreateCompetitionDto,
  UpdateCompetitionDto,
  CopyCompetitionDto,
} from './dto/competition.dto';
import { MembershipsService } from '../memberships/memberships.service';

/**
 * Endpoint Gare:
 *  GET    /competitions          → lista gare dello shop attivo
 *  POST   /competitions          → crea gara
 *  GET    /competitions/:id      → dettaglio + targets + prizes
 *  PATCH  /competitions/:id      → aggiorna (sostituisce targets/prizes se forniti)
 *  DELETE /competitions/:id      → elimina (e tutte le entries)
 *  POST   /competitions/:id/copy → copia su un altro shop dello stesso founder
 *  GET    /competitions/:id/leaderboard → classifica completa
 *  POST   /competitions/auto-monthly/run → forza generazione gara mensile (admin only)
 *
 * Permessi:
 *  - canViewCompetitions  → GET
 *  - canManageCompetitions → POST/PATCH/DELETE/COPY/RUN
 */
@Controller('competitions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CompetitionsController {
  constructor(
    private readonly competitionsService: CompetitionsService,
    private readonly autoMonthlyService: CompetitionsAutoMonthlyService,
    private readonly membershipsService: MembershipsService,
  ) {}

  @Get()
  @RequirePermission('canViewCompetitions')
  list(@Req() req: any, @Query('includeInactive') includeInactive?: string) {
    return this.competitionsService.findAll(req.user.tenantId, includeInactive === 'true');
  }

  @Post()
  @RequirePermission('canManageCompetitions')
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: any, @Body() dto: CreateCompetitionDto) {
    const userId = req.user.id || req.user.sub || req.user.userId;
    return this.competitionsService.create(req.user.tenantId, userId, dto);
  }

  /**
   * IMPORTANTE: questa rotta deve essere PRIMA di `:id` per evitare che
   * "auto-monthly" venga catturato da `:id`.
   */
  @Post('auto-monthly/run')
  @RequirePermission('canManageCompetitions')
  @HttpCode(HttpStatus.OK)
  runAutoMonthly(@Body() body?: { date?: string }) {
    const ref = body?.date ? new Date(body.date) : new Date();
    return this.autoMonthlyService.ensureMonthCompetitions(ref);
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
      // Verifica che l'utente sia FOUNDER (o ADMIN con canManageCompetitions) anche sul target shop
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
