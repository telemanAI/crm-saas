import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';

@UseGuards(JwtAuthGuard)
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('dashboard')
  async getDashboardStats(@Request() req): Promise<DashboardStatsDto> {
    const tenantId = req.user.tenantId;
    return this.statsService.getDashboardStats(tenantId);
  }

  @Get('trends')
  async getTrends(
    @Request() req,
    @Query('period') period: 'month' | 'day' = 'month',
  ) {
    const tenantId = req.user.tenantId;
    return this.statsService.getTrends(tenantId, period);
  }

  @Get('report')
  async getReport(
    @Request() req,
    @Query('range') range: 'today' | 'week' | 'month' = 'month',
  ) {
    const tenantId = req.user.tenantId;
    return this.statsService.getReport(tenantId, range);
  }
}