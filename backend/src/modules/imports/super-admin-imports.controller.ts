import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ImportsService } from './imports.service';
import { SuperAdminImportsService } from './super-admin-imports.service';

@Controller('super-admin/imports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class SuperAdminImportsController {
  constructor(
    private readonly importsService: ImportsService,
    private readonly superAdminService: SuperAdminImportsService,
  ) {}

  // ========== GET METHODS ==========
  
  @Get('jobs')
  async getAllJobs() {
    const jobs = await this.superAdminService.getAllJobsAllTenants();
    return {
      success: true,
      jobs,
    };
  }

  @Get('tenants/:tenantId/imports/jobs')
  async getTenantImportJobs(@Param('tenantId') tenantId: string) {
    const jobs = await this.importsService.getJobs(tenantId);
    return {
      success: true,
      jobs,
    };
  }

  @Get(':jobId/conflicts')
  async getConflicts(@Param('jobId') jobId: string) {
    const conflicts = await this.superAdminService.getConflicts(jobId);
    return {
      success: true,
      conflicts,
    };
  }

  // ========== POST METHODS ==========

  @Post(':jobId/pause')
  async pauseJob(@Param('jobId') jobId: string) {
    await this.superAdminService.pauseJob(jobId);
    return {
      success: true,
      message: 'Job messo in pausa',
    };
  }

  @Post(':jobId/resume')
  async resumeJob(@Param('jobId') jobId: string) {
    await this.superAdminService.resumeJob(jobId);
    return {
      success: true,
      message: 'Job ripreso',
    };
  }

  @Post(':jobId/skip-row')
  async skipRow(
    @Param('jobId') jobId: string, 
    @Body() body: { rowNumber: number }
  ) {
    await this.superAdminService.skipRow(jobId, body.rowNumber);
    return {
      success: true,
      message: `Riga ${body.rowNumber} saltata`,
    };
  }

  @Post(':jobId/rollback')
  async rollback(
    @Param('jobId') jobId: string, 
    @Body() body: { mode: 'partial' | 'full' }
  ) {
    const result = await this.superAdminService.rollback(jobId, body.mode);
    return {
      success: true,
      ...result,
    };
  }

  @Post(':jobId/remap')
  async remapJob(
    @Param('jobId') jobId: string, 
    @Body() body: any
  ) {
    await this.superAdminService.remapJob(jobId, body.mappingConfig, body.dryRun);
    return {
      success: true,
      message: 'Mapping aggiornato',
    };
  }
}
