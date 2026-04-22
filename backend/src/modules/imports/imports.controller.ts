import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ImportsService } from './imports.service';
import { UploadFileDto } from './dto/upload-file.dto';
import { ValidateImportDto } from './dto/validate-import.dto';
import { ExecuteImportDto } from './dto/execute-import.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('imports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post('upload')
  @RequirePermission('canImportData')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
    @Query('tenantId') queryTenantId: string,
    @Req() req,
  ) {
    const effectiveTenantId = (req.user?.role === 'SUPER_ADMIN' && queryTenantId) 
      ? queryTenantId 
      : req.user?.tenantId;

    if (!effectiveTenantId) {
      throw new BadRequestException('Tenant ID richiesto');
    }

    const job = await this.importsService.uploadFile(
      file,
      dto.targetEntity,
      effectiveTenantId,
      req.user.userId,
      dto.templateId,
    );

    return {
      success: true,
      job,
    };
  }

  @Get(':jobId/preview')
  async getPreview(@Param('jobId') jobId: string, @Req() req) {
    const preview = await this.importsService.getPreview(jobId, req.user.tenantId);
    return {
      success: true,
      ...preview,
    };
  }

  @Post(':jobId/validate')
  async validateImport(
    @Param('jobId') jobId: string,
    @Body() body: { mappingConfig: any; rowCorrections?: any[] },
    @Query('tenantId') queryTenantId: string,
    @Req() req,
  ) {
    const effectiveTenantId = (req.user?.role === 'SUPER_ADMIN' && queryTenantId) 
      ? queryTenantId 
      : req.user?.tenantId;
      
    if (!effectiveTenantId) {
      throw new BadRequestException('Tenant ID richiesto');
    }
    
    // PASSA rowCorrections al service
    return this.importsService.validateImport(
      jobId, 
      body.mappingConfig, 
      effectiveTenantId,
      body.rowCorrections
    );
  }

  // FIX EXECUTE: Aggiunta gestione tenantId per SuperAdmin
  @Post('execute')
  @RequirePermission('canImportData')
  async executeImport(
    @Body() dto: ExecuteImportDto & { rowCorrections?: any[] },
    @Query('tenantId') queryTenantId: string,
    @Req() req,
  ) {
    const effectiveTenantId = (req.user?.role === 'SUPER_ADMIN' && queryTenantId) 
      ? queryTenantId 
      : req.user?.tenantId;

    if (!effectiveTenantId) {
      throw new BadRequestException('Tenant ID richiesto');
    }

    // PASSA rowCorrections al service
    const job = await this.importsService.executeImport(
      dto.jobId,
      effectiveTenantId,
      req.user.userId,
      dto.rowCorrections
    );

    return {
      success: true,
      job,
    };
  }

  @Get('jobs')
  async getJobs(@Req() req) {
    const jobs = await this.importsService.getJobs(req.user.tenantId);
    return {
      success: true,
      jobs,
    };
  }

  @Get('jobs/:jobId')
  async getJob(@Param('jobId') jobId: string, @Req() req) {
    const job = await this.importsService.getJob(jobId, req.user.tenantId);
    return {
      success: true,
      job,
    };
  }

  @Post('templates')
  @RequirePermission('canImportData')
  async createTemplate(@Body() dto: CreateTemplateDto, @Req() req) {
    const template = await this.importsService.createTemplate(
      dto,
      req.user.tenantId,
      req.user.userId,
    );

    return {
      success: true,
      template,
    };
  }

  @Get('templates')
  async getTemplates(@Query('targetEntity') targetEntity: string, @Req() req) {
    const templates = await this.importsService.getTemplates(
      req.user.tenantId,
      targetEntity,
    );

    return {
      success: true,
      templates,
    };
  }

  @Get('fields/:targetEntity')
  async getTargetFields(@Param('targetEntity') targetEntity: string) {
    const fields = await this.importsService.getTargetFields(targetEntity);
    return {
      success: true,
      fields,
    };
  }
}
