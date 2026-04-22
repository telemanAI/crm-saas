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
  ParseUUIDPipe,
} from '@nestjs/common';
import { PracticesService } from './practices.service';
import { CreatePracticeDto } from './dto/create-practice.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AuditLog } from '../audit/decorators/audit-log.decorator';

// NB ordine guard: Jwt -> Permissions.
// Non usiamo RolesGuard qui per non mascherare gli errori di permesso
// granulare con un "ruolo non autorizzato" generico (UX confusa per il debug).
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('practices')
export class PracticesController {
  constructor(private readonly practicesService: PracticesService) {}

  @Post()
  @RequirePermission('canCreatePractices')
  @AuditLog({ action: 'CREATE', entityType: 'practice' })
  async create(@Request() req, @Body() dto: CreatePracticeDto) {
    const user = req.user;
    return this.practicesService.create(user.tenantId, user.userId, dto);
  }

  @Get()
  async findAll(
    @Request() req,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    const user = req.user;
    return this.practicesService.findAll(user.tenantId, { type, status });
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    const user = req.user;
    return this.practicesService.getById(user.tenantId, id);
  }

  @Put(':id/step')
  @RequirePermission('canEditPractices')
  @AuditLog({ action: 'UPDATE_STEP', entityType: 'practice' })
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
  @AuditLog({ action: 'UPDATE_OPERATIONAL_STATUS', entityType: 'practice' })
  async updateOperationalStatus(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: 'PENDING' | 'IN_PROGRESS' | 'ACTIVATED' | 'REJECTED',
  ) {
    const user = req.user;
    return this.practicesService.updateOperationalStatus(user.tenantId, id, status);
  }

  @Patch(':id/convergence')
  @RequirePermission('canEditPractices')
  @AuditLog({ action: 'UPDATE_CONVERGENCE', entityType: 'practice' })
  async updateConvergence(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('numero') numero: string,
  ) {
    const user = req.user;
    return this.practicesService.updateConvergence(user.tenantId, id, numero);
  }

  /**
   * FORZA COMPLETAMENTO (azione distruttiva/di bypass):
   * Richiede canEditPractices. Prima era protetto solo da @Roles generico
   * quindi un OPERATOR con canEditPractices=false poteva completare forzatamente.
   * Ora entrambi i check avvengono.
   */
  @Post(':id/force-complete')
  @RequirePermission('canEditPractices')
  @AuditLog({ action: 'FORCE_COMPLETE', entityType: 'practice' })
  async forceComplete(@Param('id') id: string, @Request() req) {
    return this.practicesService.forceComplete(req.user.tenantId, id);
  }

  @Delete(':id')
  @RequirePermission('canDeletePractices')
  @AuditLog({ action: 'DELETE', entityType: 'practice' })
  async remove(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    const user = req.user;
    return this.practicesService.delete(user.tenantId, id);
  }

  /**
   * DELETE NOTA:
   * - Richiede canEditPractices (gate del permesso)
   * - Il service controlla ulteriormente che sia l'autore della nota
   *   (oppure si potrebbe estendere al FOUNDER/ADMIN: per ora regola stretta).
   */
  @Delete(':id/notes/:noteIndex')
  @RequirePermission('canEditPractices')
  @AuditLog({ action: 'DELETE_NOTE', entityType: 'practice' })
  async deleteNote(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('noteIndex') noteIndex: string,
  ) {
    const user = req.user;
    return this.practicesService.deleteNote(
      user.tenantId,
      id,
      parseInt(noteIndex),
      user.userId,
    );
  }
}
