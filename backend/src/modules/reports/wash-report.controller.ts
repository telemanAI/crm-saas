import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Practice } from '../practices/entities/practice.entity';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class WashReportController {
  constructor(
    @InjectRepository(Practice)
    private practicesRepository: Repository<Practice>,
  ) {}

  @Get('wash-stats')
  async getWashStats(
    @Request() req: any,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const tenantId = req.user.tenantId;
    
    // Default: ultimi 30 giorni
    const now = new Date();
    const from = dateFrom ? new Date(dateFrom) : new Date(now.setDate(now.getDate() - 30));
    const to = dateTo ? new Date(dateTo) : new Date();

    // Query pratiche SKY TV
    const practices = await this.practicesRepository
      .createQueryBuilder('p')
      .where('p.tenant_id = :tenantId', { tenantId })
      .andWhere('p.created_at BETWEEN :from AND :to', { from, to })
      .andWhere("p.offer_name LIKE '%SKY TV%'")
      .getMany();

    const totalSkyTvPractices = practices.length;
    
    // Conta WASH types
    let suspectWashCount = 0;
    let noWashCount = 0;

    practices.forEach((p: any) => {
      const washConfig = p.washConfig || p.wash_config;
      if (washConfig?.type === 'suspect') {
        suspectWashCount++;
      } else {
        noWashCount++;
      }
    });

    const total = suspectWashCount + noWashCount;
    const suspectWashPercentage = total > 0 ? (suspectWashCount / total) * 100 : 0;

    return {
      totalSkyTvPractices,
      suspectWashCount,
      noWashCount,
      suspectWashPercentage: Math.round(suspectWashPercentage * 100) / 100,
      alertTriggered: suspectWashPercentage > 30,
      dateRange: { from, to },
    };
  }

  @Get('wash-details')
  async getWashDetails(
    @Request() req: any,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const tenantId = req.user.tenantId;
    
    const now = new Date();
    const from = dateFrom ? new Date(dateFrom) : new Date(now.setDate(now.getDate() - 30));
    const to = dateTo ? new Date(dateTo) : new Date();

    const practices = await this.practicesRepository
      .createQueryBuilder('p')
      .select([
        'p.id',
        'p.offerName',
        'p.createdAt',
        'p.washConfig',
        'p.customerSnapshot'
      ])
      .where('p.tenant_id = :tenantId', { tenantId })
      .andWhere('p.created_at BETWEEN :from AND :to', { from, to })
      .andWhere("p.offer_name LIKE '%SKY TV%'")
      .orderBy('p.created_at', 'DESC')
      .getMany();

    return practices.map((p: any) => ({
      id: p.id,
      practiceNumber: p.id.slice(0, 8).toUpperCase(),
      customerName: p.customerSnapshot ? 
        `${p.customerSnapshot.firstName || ''} ${p.customerSnapshot.lastName || ''}`.trim() 
        : 'N/D',
      offerName: p.offerName,
      createdAt: p.createdAt,
      washType: p.washConfig?.type || 'none',
      washData: p.washConfig?.suspectData || null,
    }));
  }
}