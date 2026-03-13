import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { Practice } from '../practices/entities/practice.entity';
import { DashboardStatsDto, PracticeStatusCount, TrendData } from './dto/dashboard-stats.dto';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Customer)
    private customerRepo: Repository<Customer>,
    @InjectRepository(Practice)
    private practiceRepo: Repository<Practice>,
  ) {}

  async getDashboardStats(tenantId: string): Promise<DashboardStatsDto> {
    const totalCustomers = await this.customerRepo.count({
      where: { tenantId },
    });

    const totalPractices = await this.practiceRepo.count({
      where: { tenantId },
    });

    const statusCounts = await this.practiceRepo
      .createQueryBuilder('p')
      .select('p.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('p.tenant_id = :tenantId', { tenantId })
      .groupBy('p.status')
      .getRawMany();

    const practicesByStatus: PracticeStatusCount[] = statusCounts.map(row => ({
      status: this.mapStatusLabel(row.status),
      count: parseInt(row.count, 10),
      rawStatus: row.status,
    }));

    const recentPractices = await this.practiceRepo.find({
      where: { tenantId },
      relations: ['customer'],
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const trends = await this.getTrends(tenantId, 'month');

    return {
      customers: totalCustomers,
      practices: totalPractices,
      practicesByStatus,
      recentPractices: recentPractices.map(p => ({
        id: p.id,
        number: `PR-${p.createdAt.getFullYear()}-${p.id.slice(0, 4).toUpperCase()}`,
        customerName: p.customer ? `${p.customer.firstName} ${p.customer.lastName}` : 'N/D',
        type: p.type === 'TIM_FIBRA' ? 'TIM Fibra' : 'SKY',
        status: this.mapStatusLabel(p.status),
        rawStatus: p.status,
        createdAt: p.createdAt,
      })),
      trends,
      commissions: {
        available: false,
        message: 'Funzionalità in arrivo',
      },
    };
  }

  async getTrends(tenantId: string, period: 'month' | 'day'): Promise<TrendData[]> {
    const now = new Date();
    let startDate: Date;
    let groupByFormat: string;

    if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      groupByFormat = 'YYYY-MM';
    } else {
      startDate = new Date(now.setDate(now.getDate() - 30));
      groupByFormat = 'YYYY-MM-DD';
    }

    const results = await this.practiceRepo
      .createQueryBuilder('p')
      .select(`TO_CHAR(p.created_at, '${groupByFormat}')`, 'date')
      .addSelect('COUNT(*)', 'count')
      .where('p.tenant_id = :tenantId', { tenantId })
      .andWhere('p.created_at >= :startDate', { startDate })
      .groupBy(`TO_CHAR(p.created_at, '${groupByFormat}')`)
      .orderBy('date', 'ASC')
      .getRawMany();

    return this.fillDateGaps(results, period);
  }

  async getReport(tenantId: string, range: 'today' | 'week' | 'month') {
    const now = new Date();
    let startDate: Date;

    switch (range) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const practices = await this.practiceRepo.find({
      where: {
        tenantId,
        createdAt: startDate,
      },
      relations: ['customer', 'creator'],
      order: { createdAt: 'DESC' },
    });

    const stats = await this.practiceRepo
      .createQueryBuilder('p')
      .select('COUNT(*)', 'total')
      .addSelect(`SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END)`, 'completed')
      .addSelect(`SUM(CASE WHEN p.status = 'draft' THEN 1 ELSE 0 END)`, 'draft')
      .where('p.tenant_id = :tenantId', { tenantId })
      .andWhere('p.created_at >= :startDate', { startDate })
      .getRawOne();

    return {
      range,
      period: {
        start: startDate,
        end: new Date(),
      },
      summary: {
        total: parseInt(stats.total, 10) || 0,
        completed: parseInt(stats.completed, 10) || 0,
        draft: parseInt(stats.draft, 10) || 0,
        conversionRate: stats.total > 0 
          ? Math.round((parseInt(stats.completed, 10) / parseInt(stats.total, 10)) * 100) 
          : 0,
      },
      practices: practices.map(p => ({
        id: p.id,
        type: p.type,
        status: this.mapStatusLabel(p.status),
        customer: p.customer ? `${p.customer.firstName} ${p.customer.lastName}` : 'N/D',
        createdAt: p.createdAt,
      })),
    };
  }

  private mapStatusLabel(status: string): string {
    const map: Record<string, string> = {
      draft: 'Bozza',
      completed: 'Completata',
      cancelled: 'Annullata',
    };
    return map[status] || status;
  }

  private fillDateGaps(data: any[], period: 'month' | 'day'): TrendData[] {
    if (data.length === 0) return [];

    const result: TrendData[] = [];
    const now = new Date();
    
    if (period === 'month') {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const found = data.find(item => item.date === key);
        result.push({
          date: key,
          label: d.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' }),
          count: found ? parseInt(found.count, 10) : 0,
        });
      }
    } else {
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        const found = data.find(item => item.date === key);
        result.push({
          date: key,
          label: d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
          count: found ? parseInt(found.count, 10) : 0,
        });
      }
    }
    
    return result;
  }
}