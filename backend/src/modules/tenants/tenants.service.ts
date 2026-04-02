import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepo: Repository<Tenant>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async findAll(): Promise<Tenant[]> {
    return this.tenantRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepo.findOne({
      where: { id },
      relations: ['users'],
    });
    
    if (!tenant) {
      throw new NotFoundException('Negozio non trovato');
    }
    
    return tenant;
  }

  async update(id: string, data: any): Promise<Tenant> {
    const tenant = await this.findById(id);
    
    Object.assign(tenant, data);
    return this.tenantRepo.save(tenant);
  }

  async softDelete(id: string): Promise<Tenant> {
    const tenant = await this.findById(id);
    tenant.isActive = false;
    return this.tenantRepo.save(tenant);
  }

  async hardDelete(id: string): Promise<void> {
    const tenant = await this.findById(id);
    
    // Verifica che non ci siano utenti attivi
    const activeUsers = await this.userRepo.count({
      where: { tenantId: id, isActive: true },
    });
    
    if (activeUsers > 0) {
      throw new BadRequestException('Impossibile eliminare: ci sono ancora utenti attivi nel negozio');
    }
    
    await this.tenantRepo.remove(tenant);
  }

  async reactivate(id: string): Promise<Tenant> {
    const tenant = await this.findById(id);
    tenant.isActive = true;
    return this.tenantRepo.save(tenant);
  }

  async count(): Promise<number> {
    return this.tenantRepo.count();
  }

  async countActive(): Promise<number> {
    return this.tenantRepo.count({
      where: { isActive: true },
    });
  }
}