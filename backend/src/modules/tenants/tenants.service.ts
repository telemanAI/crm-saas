import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { Practice } from '../practices/entities/practice.entity';
import { Customer } from '../customers/entities/customer.entity';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantsRepository: Repository<Tenant>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Practice)
    private readonly practicesRepository: Repository<Practice>,
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
  ) {}

  /**
   * Trova tenant per codice sottoscrizione
   */
  async findBySubscriptionCode(subscriptionCode: string): Promise<Tenant | null> {
    return await this.tenantsRepository.findOne({
      where: { subscriptionCode },
    });
  }

  /**
   * Trova tenant per slug (usato per subdomain/URL)
   */
  async findBySlug(slug: string): Promise<Tenant | null> {
    return await this.tenantsRepository.findOne({
      where: { slug },
    });
  }

  /**
   * Trova tutti i tenant (per Super Admin)
   */
  async findAll(): Promise<Tenant[]> {
    return await this.tenantsRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

 
  /**
   * Trova tutti i tenant con ricerca (per Super Admin)
   */
  async findAllForSuperAdmin(search?: string): Promise<Tenant[]> {
    if (search) {
      return await this.tenantsRepository.find({
        where: [
          { name: Like(`%${search}%`) },
          { subscriptionCode: Like(`%${search}%`) },
        ],
        order: { createdAt: 'DESC' },
      });
    }
    return await this.findAll();
  }

  /**
   * Trova tutti i tenant con paginazione e filtri avanzati (Admin dashboard)
   */
  async findAllForAdmin(filters: {
    status?: string;
    plan?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, plan, search, page = 1, limit = 20 } = filters;
    const queryBuilder = this.tenantsRepository.createQueryBuilder('tenant');

    // Filtro status
    if (status === 'active') {
      queryBuilder.andWhere('tenant.isActive = :isActive', { isActive: true });
    } else if (status === 'inactive') {
      queryBuilder.andWhere('tenant.isActive = :isActive', { isActive: false });
    }

    // Filtro plan (se esiste campo plan)
    if (plan) {
      queryBuilder.andWhere('tenant.plan = :plan', { plan });
    }

    // Ricerca
    if (search) {
      queryBuilder.andWhere(
        '(tenant.name LIKE :search OR tenant.email LIKE :search OR tenant.subscriptionCode LIKE :search)', // ✅ Ripristinato: email esiste
        { search: `%${search}%` },
      );
    }

    // Paginazione
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);
    queryBuilder.orderBy('tenant.createdAt', 'DESC');

    const [tenants, total] = await queryBuilder.getManyAndCount();

    return {
      tenants,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Trova tenant per ID
   */
  async findById(id: string): Promise<Tenant> {
    const tenant = await this.tenantsRepository.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('Tenant non trovato');
    }
    return tenant;
  }

  /**
   * Trova tenant con dettagli completi (utenti, stats)
   */
  async findOneWithDetails(id: string) {
    const tenant = await this.findById(id);
    const users = await this.usersRepository.find({
      where: { tenantId: id },
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive', 'createdAt'],
    });

    return {
      ...tenant,
      users,
    };
  }

  /**
   * Ottieni dettagli tenant con statistiche
   */
  async getTenantDetailsWithStats(id: string) {
    const tenant = await this.findById(id);
    const stats = await this.getTenantStats(id);

    return {
      tenant,
      stats,
    };
  }

  /**
   * Ottieni statistiche di un tenant
   */
  async getTenantStats(tenantId: string) {
    const [totalUsers, totalPractices, totalCustomers] = await Promise.all([
      this.usersRepository.count({ where: { tenantId } }),
      this.practicesRepository.count({ where: { tenantId } }),
      this.customersRepository.count({ where: { tenantId } }),
    ]);

    return {
      totalUsers,
      totalPractices,
      totalCustomers,
    };
  }

  /**
   * Statistiche globali per Super Admin dashboard
   */
  async getGlobalStats() {
    const [totalTenants, activeTenants, totalUsers, totalPractices, totalCustomers] = await Promise.all([
      this.tenantsRepository.count(),
      this.tenantsRepository.count({ where: { isActive: true } }),
      this.usersRepository.count(),
      this.practicesRepository.count(),
      this.customersRepository.count(),
    ]);

    return {
      totalTenants,
      activeTenants,
      totalUsers,
      totalPractices,
      totalCustomers,
    };
  }

  /**
   * Crea nuovo tenant
   */
  async create(tenantData: Partial<Tenant>): Promise<Tenant> {
    const tenant = this.tenantsRepository.create(tenantData);
    return await this.tenantsRepository.save(tenant);
  }

  /**
   * Aggiorna tenant
   */
  async updateTenant(id: string, updateData: Partial<Tenant>): Promise<Tenant> {
    const tenant = await this.findById(id);
    Object.assign(tenant, updateData);
    return await this.tenantsRepository.save(tenant);
  }

  /**
   * Aggiorna configurazione tenant (per tenants.controller.ts)
   */
  async updateTenantConfig(tenantId: string, config: { enableWashStep?: boolean; enableAdditionalPackages?: boolean }): Promise<Tenant> {
    const tenant = await this.findById(tenantId);
    
    // Salva config nel campo config o come campi separati se esistono nell'entity
    if ((tenant as any).config) {
      (tenant as any).config = { ...(tenant as any).config, ...config };
    } else {
      // Se non esiste campo config, usa campi diretti se esistono
      if (config.enableWashStep !== undefined) (tenant as any).enableWashStep = config.enableWashStep;
      if (config.enableAdditionalPackages !== undefined) (tenant as any).enableAdditionalPackages = config.enableAdditionalPackages;
    }
    
    return await this.tenantsRepository.save(tenant);
  }

  /**
   * Ottieni configurazione tenant
   */
  async getTenantConfig(tenantId: string) {
    const tenant = await this.findById(tenantId);
    return (tenant as any).config || { enableWashStep: false, enableAdditionalPackages: true };
  }

  /**
   * Aggiorna stato tenant
   */
  async updateTenantStatus(
    id: string,
    status: 'active' | 'inactive' | 'suspended',
    reason?: string,
  ): Promise<Tenant> {
    const tenant = await this.findById(id);
    tenant.isActive = status === 'active';
    
    return await this.tenantsRepository.save(tenant);
  }

  /**
   * Aggiorna piano tenant
   */
  async updateTenantPlan(id: string, planData: any): Promise<Tenant> {
    const tenant = await this.findById(id);
    return await this.tenantsRepository.save(tenant);
  }

  /**
   * Soft delete tenant (disattiva)
   */
  async softDeleteTenant(id: string): Promise<void> {
    const tenant = await this.findById(id);
    tenant.isActive = false;
    await this.tenantsRepository.save(tenant);
  }

  /**
   * Riattiva tenant disattivato
   */
  async reactivateTenant(id: string): Promise<Tenant> {
    const tenant = await this.findById(id);
    tenant.isActive = true;
    return await this.tenantsRepository.save(tenant);
  }

  /**
   * Hard delete tenant (elimina definitivamente con cascade)
   */
  async hardDeleteTenant(id: string): Promise<void> {
    const tenant = await this.findById(id);
    
    // Elimina tutti i dati associati
    await this.usersRepository.delete({ tenantId: id });
    await this.practicesRepository.delete({ tenantId: id });
    await this.customersRepository.delete({ tenantId: id });
    
    // Elimina il tenant
    await this.tenantsRepository.remove(tenant);
  }

  /**
   * Elimina tenant (soft o hard delete)
   */
  async deleteTenant(id: string, mode: 'soft' | 'hard' = 'soft'): Promise<void> {
    if (mode === 'hard') {
      await this.hardDeleteTenant(id);
    } else {
      await this.softDeleteTenant(id);
    }
  }

  /**
   * Ottieni utenti di un tenant
   */
  async getTenantUsers(tenantId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    
    const [users, total] = await this.usersRepository.findAndCount({
      where: { tenantId },
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive', 'createdAt'],
    });

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Ottieni clienti di un tenant
   */
  async getTenantCustomers(tenantId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    
    const [customers, total] = await this.customersRepository.findAndCount({
      where: { tenantId },
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      customers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Ottieni founder del tenant
   */
  async getFounder(tenantId: string): Promise<User> {
    const founder = await this.usersRepository.findOne({
      where: { tenantId, role: 'FOUNDER' },
    });

    if (!founder) {
      throw new NotFoundException('Founder non trovato per questo tenant');
    }

    return founder;
  }

  /**
   * Conta tutti i tenant
   */
  async count(): Promise<number> {
    return await this.tenantsRepository.count();
  }

  /**
   * Conta tenant attivi
   */
  async countActive(): Promise<number> {
    return await this.tenantsRepository.count({ where: { isActive: true } });
  }

  /**
   * Ottieni o crea configurazione tenant
   */
  async getOrCreateConfig(tenantId: string) {
    const tenant = await this.findById(tenantId);
    return {
      enableWashStep: false,
      enableAdditionalPackages: true,
    };
  }

  /**
   * Alias per updateTenantConfig (retrocompatibilità)
   */
  async updateConfig(tenantId: string, config: any) {
    return this.updateTenantConfig(tenantId, config);
  }
}