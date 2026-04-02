import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { Practice } from '../practices/entities/practice.entity';
import { Customer } from '../customers/entities/customer.entity';

/**
 * Controller per API Super Admin generiche
 */
@Controller('api/super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class SuperAdminController {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Practice)
    private practiceRepository: Repository<Practice>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
  ) {}

  /**
   * GET /api/super-admin/stats
   * Statistiche globali per dashboard
   */
  @Get('stats')
  async getGlobalStats() {
    const [
      totalTenants,
      activeTenants,
      totalUsers,
      totalPractices,
      totalCustomers,
    ] = await Promise.all([
      this.tenantRepository.count(),
      this.tenantRepository.count({ where: { isActive: true } }),
      this.userRepository.count(),
      this.practiceRepository.count(),
      this.customerRepository.count(),
    ]);

    // Import recenti (ultimi 7 giorni)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return {
      success: true,
      totalTenants,
      activeTenants,
      totalUsers,
      totalPractices,
      totalCustomers,
    };
  }

  /**
   * GET /api/super-admin/activity/recent
   * Attività recente (placeholder per ora)
   */
  @Get('activity/recent')
  async getRecentActivity() {
    // TODO: Implementare audit log table
    return {
      success: true,
      activities: [],
    };
  }

  /**
   * GET /api/super-admin/audit
   * Logs di sistema (placeholder)
   */
  @Get('audit')
  async getAuditLogs() {
    // TODO: Implementare sistema di logging
    return {
      success: true,
      logs: [],
      message: 'Sistema audit in sviluppo',
    };
  }
}