import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ImportsService } from './imports.service';
import { SuperAdminImportsService } from './super-admin-imports.service';

@Controller('api/admin/imports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class SuperAdminImportsController {
  constructor(
    private readonly importsService: ImportsService,
    private readonly superAdminImportsService: SuperAdminImportsService,
  ) {}

  /**
   * GET /api/admin/imports/jobs
   * Lista tutti i job di tutti i tenant con filtri
   */
  @Get('jobs')
  async getAllJobs(
    @Query('status') status?: string,
    @Query('tenantId') tenantId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const jobs = await this.superAdminImportsService.findAllJobs({
      status,
      tenantId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });

    return {
      success: true,
      jobs,
      count: jobs.length,
    };
  }

  /**
   * GET /api/admin/imports/jobs/:jobId
   * Dettaglio completo di un job specifico (cross-tenant)
   */
  @Get('jobs/:jobId')
  async getJobDetails(@Param('jobId') jobId: string) {
    const job = await this.importsService.getJobWithFullDetails(jobId);
    return {
      success: true,
      job,
    };
  }

  // ==========================================
  // METODI ESISTENTI (RETROCOMPATIBILITÀ)
  // ==========================================

  @Post(':jobId/pause')
  @HttpCode(HttpStatus.OK)
  async pauseJob(@Param('jobId') jobId: string) {
    const result = await this.superAdminImportsService.pauseJob(jobId);
    return {
      success: true,
      message: 'Import messo in pausa',
      jobId,
      status: result.status,
    };
  }

  @Post(':jobId/resume')
  @HttpCode(HttpStatus.OK)
  async resumeJob(@Param('jobId') jobId: string) {
    const result = await this.superAdminImportsService.resumeJob(jobId);
    return {
      success: true,
      message: 'Import ripreso',
      jobId,
      status: result.status,
    };
  }

  @Post(':jobId/skip-row')
  @HttpCode(HttpStatus.OK)
  async skipRow(
    @Param('jobId') jobId: string,
    @Body() body: { rowNumber: number },
  ) {
    const result = await this.superAdminImportsService.skipRow(jobId, body.rowNumber);
    return {
      success: true,
      message: `Riga ${body.rowNumber} saltata`,
      jobId,
    };
  }

  @Post(':jobId/rollback')
  @HttpCode(HttpStatus.OK)
  async rollbackImport(
    @Param('jobId') jobId: string,
    @Body() body: { mode: 'full' | 'partial'; reason?: string },
    @Req() req,
  ) {
    const job = await this.importsService.getJobWithFullDetails(jobId);
    
    const result = await this.importsService.rollbackImport(
      jobId,
      job.tenantId,
      body.mode,
    );

    await this.superAdminImportsService.logAdminAction({
      action: 'ROLLBACK_IMPORT',
      jobId,
      tenantId: job.tenantId,
      adminId: req.user.sub,
      reason: body.reason || 'Rollback eseguito da SuperAdmin',
      timestamp: new Date(),
    });

    return {
      success: true,
      message: `Rollback ${body.mode} completato`,
      details: result,
    };
  }

  // ==========================================
  // NUOVI METODI (GESTIONE UNIFIED IMPORT)
  // ==========================================

  @Post(':jobId/retry')
  @HttpCode(HttpStatus.OK)
  async retryJob(@Param('jobId') jobId: string, @Req() req) {
    const job = await this.importsService.getJobWithFullDetails(jobId);
    
    const result = await this.superAdminImportsService.retryJob(jobId, job.tenantId);

    await this.superAdminImportsService.logAdminAction({
      action: 'RETRY_JOB',
      jobId,
      tenantId: job.tenantId,
      adminId: req.user.sub,
      reason: 'Retry dopo fix',
      timestamp: new Date(),
    });

    return {
      success: true,
      message: 'Nuovo job creato per retry',
      newJobId: result.newJobId,
    };
  }

  @Post(':jobId/dry-run')
  @HttpCode(HttpStatus.OK)
  async dryRun(@Param('jobId') jobId: string) {
    const job = await this.importsService.getJobWithFullDetails(jobId);
    
    const simulation = await this.superAdminImportsService.simulateImport(
      jobId,
      job.tenantId,
    );

    return {
      success: true,
      simulation,
      note: 'Simulazione completata. Nessun dato salvato.',
    };
  }

  @Get('stats')
  async getGlobalStats(@Query('days') days: number = 7) {
    const stats = await this.superAdminImportsService.getGlobalStats(days);
    
    return {
      success: true,
      stats: {
        period: `${days} giorni`,
        ...stats,
      },
    };
  }
}