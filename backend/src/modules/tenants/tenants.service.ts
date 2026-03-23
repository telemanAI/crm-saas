import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private tenantsRepository: Repository<Tenant>,
  ) {}

  async findBySubscriptionCode(code: string): Promise<Tenant | null> {
    return this.tenantsRepository.findOne({ where: { subscriptionCode: code } });
  }

  async findById(id: string): Promise<Tenant> {
    const tenant = await this.tenantsRepository.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant non trovato');
    return tenant;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.tenantsRepository.findOne({ where: { slug } });
  }

  async create(tenantData: Partial<Tenant>): Promise<Tenant> {
    const tenant = this.tenantsRepository.create(tenantData);
    return this.tenantsRepository.save(tenant);
  }

  async findAll(): Promise<Tenant[]> {
    return this.tenantsRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findAllForAdmin(options: any): Promise<any> {
    const [tenants, total] = await this.tenantsRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: ((options.page || 1) - 1) * (options.limit || 20),
      take: options.limit || 20,
    });
    return { data: tenants, total, page: options.page || 1, limit: options.limit || 20 };
  }

  async getGlobalStats(): Promise<any> {
    const total = await this.tenantsRepository.count();
    const active = await this.tenantsRepository.count({ where: { isActive: true } });
    return { totalTenants: total, activeTenants: active };
  }

  async getTenantDetailsWithStats(id: string): Promise<any> {
    const tenant = await this.findById(id);
    return { ...tenant, stats: {} };
  }

  async updateTenantStatus(id: string, status: string, reason?: string): Promise<any> {
    const tenant = await this.findById(id);
    tenant.subscriptionStatus = status;
    return this.tenantsRepository.save(tenant);
  }

  async updateTenantPlan(id: string, planData: any): Promise<any> {
    const tenant = await this.findById(id);
    if (planData.planType) tenant.planType = planData.planType;
    return this.tenantsRepository.save(tenant);
  }

  async softDeleteTenant(id: string): Promise<any> {
    const tenant = await this.findById(id);
    tenant.isActive = false;
    return this.tenantsRepository.save(tenant);
  }

  // Riattiva un tenant disattivato
  async reactivateTenant(id: string): Promise<Tenant> {
    const tenant = await this.findById(id);
    tenant.isActive = true;
    return this.tenantsRepository.save(tenant);
  }

  // Elimina definitivamente un tenant (hard delete) - FIXATO
  async hardDeleteTenant(id: string): Promise<void> {
    // Verifica che il tenant esista
    const tenant = await this.findById(id);
    
    // Esegui tutto in una transazione per garantire atomicità
    await this.tenantsRepository.manager.transaction(async (entityManager) => {
      // 1. Elimina prima le pratiche (potrebbero avere FK verso users)
      await entityManager
        .createQueryBuilder()
        .delete()
        .from('sales_practices')
        .where('tenant_id = :id', { id })
        .execute();
      
      // 2. Poi elimina gli utenti
      await entityManager
        .createQueryBuilder()
        .delete()
        .from('users')
        .where('tenant_id = :id', { id })
        .execute();
      
      // 3. Infine elimina il tenant
      await entityManager.remove(tenant);
    });
  }

  async getTenantUsers(id: string, page: number, limit: number): Promise<any> {
    return { data: [], total: 0, page, limit };
  }

  async getTenantCustomers(id: string, page: number, limit: number): Promise<any> {
    return { data: [], total: 0, page, limit };
  }
}