import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import {
  Controller,
  Get,
  Post,
  Put,
  Patch, // NUOVO
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
  ) {
    const user = req.user;
    return this.practicesService.findAll(user.tenantId, { type, status });
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
  async updateStep(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStepDto,
  ) {
    const user = req.user;
    return this.practicesService.updateStep(user.tenantId, user.userId, id, dto);
  }

  // NUOVO: Endpoint per cambiare stato operativo (PENDING, IN_PROGRESS, ACTIVATED, REJECTED)
  @Put(':id/operational-status')
  async updateOperationalStatus(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: 'PENDING' | 'IN_PROGRESS' | 'ACTIVATED' | 'REJECTED',
  ) {
    const user = req.user;
    return this.practicesService.updateOperationalStatus(user.tenantId, id, status);
  }

  // NUOVO: Endpoint per aggiornare solo il numero convergenza (inline edit dal dettaglio)
  @Patch(':id/convergence')
  async updateConvergence(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('numero') numero: string,
  ) {
    const user = req.user;
    return this.practicesService.updateConvergence(user.tenantId, id, numero);
  }

  @Post(':id/force-complete')
  @Roles('ADMIN', 'OPERATOR', 'BACKOFFICE')
  async forceComplete(@Param('id') id: string, @Request() req) {
    return this.practicesService.forceComplete(req.user.tenantId, id);
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