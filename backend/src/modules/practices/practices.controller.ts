// backend/src/modules/practices/practices.controller.ts
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  ParseUUIDPipe
} from '@nestjs/common';
import { PracticesService } from './practices.service';
import { CreatePracticeDto } from './dto/create-practice.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { UpdateOperationalStatusDto } from './dto/update-operational-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('practices')
export class PracticesController {
  constructor(
    private readonly practicesService: PracticesService,
  ) {}

  @Post()
  @RequirePermission('canCreatePractices')
  async create(
    @Request() req,
    @Body() dto: CreatePracticeDto,
  ) {
    const user = req.user;
    return this.practicesService.create(user.tenantId, user.userId, dto);
  }

  @Get()
  async findAll(
    @Request() req,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('skyTvStatus') skyTvStatus?: string,
  ) {
    const user = req.user;
    return this.practicesService.findAll(user.tenantId, { type, status, skyTvStatus });
  }

  @Get(':id')
  async findOne(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const user = req.user;
    return this.practicesService.getById(user.tenantId, id);
  }

  @Put(':id/step')
  @RequirePermission('canEditPractices')
  async updateStep(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStepDto,
  ) {
    const user = req.user;
    return this.practicesService.updateStep(user.tenantId, user.userId, id, dto);
  }

  @Put(':id/operational-status')
  @RequirePermission('canEditPractices')
  async updateOperationalStatus(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOperationalStatusDto,
  ) {
    const user = req.user;
    return this.practicesService.updateOperationalStatus(
      user.tenantId,
      id,
      dto.status,
      dto.koReason,
      dto.skyTvStatus,
      user.userId,
    );
  }

  @Patch(':id/convergence')
  @RequirePermission('canEditPractices')
  async updateConvergence(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('numero') numero: string,
  ) {
    const user = req.user;
    return this.practicesService.updateConvergence(user.tenantId, id, numero);
  }

  @Patch(':id/sky-tv-status')
  @RequirePermission('canEditPractices')
  async updateSkyTvStatus(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('skyTvStatus') skyTvStatus: any,
    @Body('skyTvKoReason') skyTvKoReason?: string,
  ) {
    const user = req.user;
    return this.practicesService.updateSkyTvStatus(
      user.tenantId,
      id,
      skyTvStatus || null,
      skyTvKoReason,
      user.userId,
    );
  }

  @Post(':id/force-complete')
  @Roles('ADMIN', 'OPERATOR', 'BACKOFFICE')
  async forceComplete(@Param('id') id: string, @Request() req) {
    return this.practicesService.forceComplete(req.user.tenantId, id);
  }

  /**
   * FIX BUG GARE — Riparazione storico.
   *
   * Scansiona le pratiche con offerId=NULL ma offerName valorizzato e tenta
   * di risolvere l'offerId per nome. Indispensabile dopo aver aggiunto nuove
   * promo o quando il wizard non passava offerId.
   *
   * Body opzionale: { allTenants: true } → scansiona tutti gli shop.
   * Default: solo lo shop attivo del chiamante.
   *
   * Solo FOUNDER/ADMIN/SUPER_ADMIN.
   */
  @Post('repair-offer-links')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FOUNDER')
  async repairOfferLinks(
    @Request() req,
    @Body() body?: { allTenants?: boolean },
  ) {
    const scope = body?.allTenants ? undefined : req.user.tenantId;
    return this.practicesService.repairOfferLinks(scope);
  }

  @Delete(':id')
  @Roles('ADMIN', 'OPERATOR', 'BACKOFFICE')
  @RequirePermission('canDeletePractices')
  async remove(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const user = req.user;
    return this.practicesService.delete(user.tenantId, id);
  }

  @Delete(':id/notes/:noteIndex')
  async deleteNote(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('noteIndex') noteIndex: string,
  ) {
    const user = req.user;
    return this.practicesService.deleteNote(user.tenantId, id, parseInt(noteIndex), user.userId);
  }
}