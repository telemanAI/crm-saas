import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true, name: 'subscriptioncode' })
  subscriptionCode: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 50, name: 'vat_number', nullable: true })
  vatNumber: string;

  @Column({ type: 'jsonb', default: {}, name: 'address' })
  address: any;

  @Column({ type: 'varchar', length: 50, default: 'trial', name: 'subscription_status' })
  subscriptionStatus: string;

  @Column({ type: 'varchar', length: 50, default: 'basic', name: 'plan_type' })
  planType: string;

  @Column({ type: 'jsonb', default: {}, name: 'plan_limits' })
  planLimits: any;

  @Column({ type: 'jsonb', default: {}, name: 'settings' })
  settings: any;
  
  @Column({ type: 'boolean', default: false, name: 'enable_wash_step' })
  enableWashStep: boolean;

  @Column({ type: 'boolean', default: true, name: 'enable_additional_packages' })
  enableAdditionalPackages: boolean;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}