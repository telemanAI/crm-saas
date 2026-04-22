import { Controller, Post, Body, Res, UseGuards, Req } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExportsService, ExportFilters } from './exports.service';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import * as fs from 'fs';

@Controller('api/exports')
@UseGuards(JwtAuthGuard)
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
      // Cancella file dopo download
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
      // Cancella file dopo download
      fs.unlinkSync(filePath);
    });
  }
}
