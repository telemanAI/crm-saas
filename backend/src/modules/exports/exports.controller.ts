// backend/src/modules/exports/exports.controller.ts
import { Controller, Post, Body, Res, UseGuards, Req } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ExportsService, ExportFilters } from './exports.service';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import * as fs from 'fs';

@Controller('exports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Post('practices')
  @RequirePermission('canExportData')
  async exportPractices(
    @Body() body: { filters: ExportFilters; format?: 'xlsx' | 'csv' },
    @Req() req,
    @Res() res: Response,
  ) {
    const filePath = await this.exportsService.exportPractices(
      body.filters,
      req.user.tenantId,
      body.format || 'xlsx',
    );

    const fileName = filePath.split('/').pop();
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
      }
      fs.unlinkSync(filePath);
    });
  }

  @Post('customers')
  @RequirePermission('canExportData')
  async exportCustomers(
    @Body() body: { format?: 'xlsx' | 'csv' },
    @Req() req,
    @Res() res: Response,
  ) {
    const filePath = await this.exportsService.exportCustomers(
      req.user.tenantId,
      body.format || 'xlsx',
    );

    const fileName = filePath.split('/').pop();
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
      }
      fs.unlinkSync(filePath);
    });
  }

  /**
   * Phase F — Export multi-categoria: workbook xlsx con un foglio per categoria.
   *  Linea Fissa, Mobile, Luce/Gas, SKY, Clienti.
   */
  @Post('practices-multi-sheet')
  @RequirePermission('canExportData')
  async exportPracticesMultiSheet(
    @Body() body: { filters: ExportFilters },
    @Req() req,
    @Res() res: Response,
  ) {
    const filePath = await this.exportsService.exportPracticesMultiSheet(
      body.filters || {},
      req.user.tenantId,
    );
    const fileName = filePath.split('/').pop();
    res.download(filePath, fileName, (err) => {
      if (err) console.error('Error downloading multi-sheet:', err);
      fs.unlinkSync(filePath);
    });
  }
}