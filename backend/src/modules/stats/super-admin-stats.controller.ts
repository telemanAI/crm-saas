import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantsService } from '../tenants/tenants.service';
import { UsersService } from '../users/users.service';
import { PracticesService } from '../practices/practices.service';
import { CustomersService } from '../customers/customers.service';
import { ImportsService } from '../imports/imports.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../audit/entities/audit-log.entity';

@Controller('api/super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class SuperAdminStatsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly usersService: UsersService,
    private readonly practicesService: PracticesService,
    private readonly customersService: CustomersService,
    private readonly importsService: ImportsService,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * GET /api/super-admin/stats
   * Statistiche globali della piattaforma
   */
  @Get('stats')
  async getGlobalStats() {
    const [tenants, users, practices, customers, recentImports] = await Promise.all([
      this.tenantsService.count(),
      this.usersService.count(),
      this.practicesService.count(),
      this.customersService.count(),
      this.importsService.countRecent(7), // ultimi 7 giorni
    ]);

    const activeTenants = await this.tenantsService.countActive();

    return {
      success: true,
      totalTenants: tenants,
      activeTenants: activeTenants,
      totalUsers: users,
      totalPractices: practices,
      totalCustomers: customers,
      recentImports: recentImports,
    };
  }

  /**
   * GET /api/super-admin/activity/recent
   * Attività recente sulla piattaforma
   */
  @Get('activity/recent')
  async getRecentActivity() {
    const activities = await this.auditLogRepository.find({
      order: { createdAt: 'DESC' },
      take: 20,
      relations: ['user', 'tenant'],
    });

    return {
      success: true,
      activities: activities.map((log) => ({
        id: log.id,
        message: log.action || log.details || 'Attività',
        timestamp: log.createdAt,
        user: log.user
          ? {
              id: log.user.id,
              email: log.user.email,
            }
          : null,
        tenant: log.tenant
          ? {
              id: log.tenant.id,
              name: log.tenant.name,
            }
          : null,
      })),
    };
  }

  /**
   * GET /api/super-admin/audit
   * Log di audit filtrabili
   */
  @Get('audit')
  async getAuditLogs() {
    const logs = await this.auditLogRepository.find({
      order: { createdAt: 'DESC' },
      take: 100,
      relations: ['user', 'tenant'],
    });

    return logs.map((log) => ({
      id: log.id,
      level: log.level || 'info',
      action: log.action,
      message: log.details,
      timestamp: log.createdAt,
      user: log.user
        ? {
            id: log.user.id,
            email: log.user.email,
          }
        : null,
      tenantId: log.tenant?.id,
      metadata: log.metadata || {},
    }));
  }
}