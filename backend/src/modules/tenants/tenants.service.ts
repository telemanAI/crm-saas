import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Like } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { User } from '../users/entities/user.entity'; // Assicurati che il path sia corretto

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private tenantsRepository: Repository<Tenant>,
    private dataSource: DataSource, // Aggiunto per le query raw
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

  // Elimina definitivamente un tenant (hard delete)
  async hardDeleteTenant(id: string): Promise<void> {
    // Verifica che il tenant esista
    await this.findById(id);
    
    // Elimina in ordine: prima i record figli, poi il tenant
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      // 1. Elimina users collegati
      await queryRunner.query('DELETE FROM users WHERE tenant_id = $1', [id]);
      
      // 2. Elimina sales_practices collegate
      await queryRunner.query('DELETE FROM sales_practices WHERE tenant_id = $1', [id]);
      
      // 3. Elimina il tenant
      await queryRunner.query('DELETE FROM tenants WHERE id = $1', [id]);
      
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getTenantUsers(id: string, page: number, limit: number): Promise<any> {
    return { data: [], total: 0, page, limit };
  }

  /**
   * Trova tutti i tenant per Super Admin
   * @param search - Ricerca per nome, email, businessCode
   */
  async findAllForSuperAdmin(search?: string): Promise<Tenant[]> {
    const where: any = {};

    if (search) {
      // Ricerca in nome, email, businessCode
      where.name = Like(`%${search}%`);
    }

    return await this.tenantsRepository.find({
      where,
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Trova tenant con dettagli completi (per dashboard Super Admin)
   */
  async findOneWithDetails(tenantId: string): Promise<Tenant> {
    const tenant = await this.tenantsRepository.findOne({
      where: { id: tenantId },
      relations: ['createdBy'],
    });

    if (!tenant) {
      throw new NotFoundException('Negozio non trovato');
    }

    return tenant;
  }

  /**
   * Statistiche negozio (clienti, pratiche, utenti)
   */
  async getTenantStats(tenantId: string): Promise<any> {
    // Query per contare clienti
    const customersCount = await this.dataSource.query(
      'SELECT COUNT(*) as count FROM customers WHERE tenant_id = $1',
      [tenantId],
    );

    // Query per contare pratiche
    const practicesCount = await this.dataSource.query(
      'SELECT COUNT(*) as count FROM practices WHERE tenant_id = $1',
      [tenantId],
    );

    // Query per contare utenti
    const usersCount = await this.dataSource.query(
      'SELECT COUNT(*) as count FROM users WHERE tenant_id = $1',
      [tenantId],
    );

    // Query pratiche per stato
    const practicesByStatus = await this.dataSource.query(
      'SELECT status, COUNT(*) as count FROM practices WHERE tenant_id = $1 GROUP BY status',
      [tenantId],
    );

    return {
      customers: parseInt(customersCount[0]?.count || '0'),
      practices: parseInt(practicesCount[0]?.count || '0'),
      users: parseInt(usersCount[0]?.count || '0'),
      practicesByStatus: practicesByStatus.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {}),
    };
  }

  /**
   * Aggiorna tenant
   */
  async updateTenant(tenantId: string, updateData: Partial<Tenant>): Promise<Tenant> {
    const tenant = await this.tenantsRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Negozio non trovato');
    }

    // Campi aggiornabili
    const allowedFields = ['name', 'email', 'phone', 'address', 'businessCode', 'isActive'];
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        tenant[field] = updateData[field];
      }
    });

    return await this.tenantsRepository.save(tenant);
  }

  /**
   * Elimina tenant (soft o hard delete)
   */
  async deleteTenant(tenantId: string, mode: 'soft' | 'hard' = 'soft'): Promise<void> {
    const tenant = await this.tenantsRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Negozio non trovato');
    }

    if (mode === 'soft') {
      // Soft delete: disabilita negozio
      tenant.isActive = false;
      await this.tenantsRepository.save(tenant);
    } else {
      // Hard delete: elimina tutto (CASCADE nelle foreign keys)
      // ATTENZIONE: Questo elimina TUTTI i dati del negozio
      await this.tenantsRepository.remove(tenant);
    }
  }

  /**
   * Trova il fondatore del negozio (primo utente ADMIN creato)
   */
  async getFounder(tenantId: string): Promise<User> {
    const founder = await this.dataSource.query(
      `SELECT * FROM users 
       WHERE tenant_id = $1 
       AND role IN ('ADMIN', 'FOUNDER') 
       ORDER BY created_at ASC 
       LIMIT 1`,
      [tenantId],
    );

    if (!founder || founder.length === 0) {
      throw new NotFoundException('Fondatore non trovato');
    }

    return founder[0];
  }

  async getTenantCustomers(id: string, page: number, limit: number): Promise<any> {
    return { data: [], total: 0, page, limit };
  }
  
  async updateTenantConfig(id: string, config: { enableWashStep?: boolean; enableAdditionalPackages?: boolean }): Promise<Tenant> {
    const tenant = await this.findById(id);
    
    if (config.enableWashStep !== undefined) {
      tenant.enableWashStep = config.enableWashStep;
    }
    if (config.enableAdditionalPackages !== undefined) {
      tenant.enableAdditionalPackages = config.enableAdditionalPackages;
    }
    
    return this.tenantsRepository.save(tenant);
  }
}