import { Controller, Get, Query, Req, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { PdfReportService } from './pdf-report.service';

@Controller('reports/pdf')
export class PdfReportController {
  constructor(private readonly pdfService: PdfReportService) {}

  /** Report mensile pezzi venduti — PDF scaricabile. Solo founder. */
  @Get('monthly')
  async monthly(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
    @Query('month') month?: string, // YYYY-MM opzionale
  ) {
    const userId = req.user?.id || req.user?.sub;
    const tenantId = req.user?.tenantId;
    const companyId = req.user?.companyId || null;

    const buffer = await this.pdfService.generateMonthlyReport({
      tenantId,
      userId,
      companyId,
      month,
    });

    const filename = `report-pezzi-${month || new Date().toISOString().slice(0, 7)}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    return new StreamableFile(buffer);
  }
}
