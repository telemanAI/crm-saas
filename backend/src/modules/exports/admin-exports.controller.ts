import { Controller, Post, Body, Res, UseGuards, Param } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ExportsService, ExportFilters } from './exports.service';
import * as fs from 'fs';

@Controller('api/admin/exports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  /**
   * POST /api/admin/exports/:tenantId/practices
   * Super Admin esporta pratiche di un tenant specifico
   */
  @Post(':tenantId/practices')
  async exportPractices(
    @Param('tenantId') tenantId: string,
    @Body() body: { filters: ExportFilters; format?: 'xlsx' | 'csv' },
    @Res() res: Response,
  ) {
    const filePath = await this.exportsService.exportPractices(
      body.filters,
      tenantId,
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

  /**
   * POST /api/admin/exports/:tenantId/customers
   * Super Admin esporta clienti di un tenant specifico
   */
  @Post(':tenantId/customers')
  async exportCustomers(
    @Param('tenantId') tenantId: string,
    @Body() body: { format?: 'xlsx' | 'csv' },
    @Res() res: Response,
  ) {
    const filePath = await this.exportsService.exportCustomers(
      tenantId,
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
}