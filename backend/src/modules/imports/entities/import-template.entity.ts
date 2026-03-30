import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import { ImportTargetEntity } from './import-job.entity';

@Entity('import_templates')
export class ImportTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'target_entity', type: 'varchar' })
  targetEntity: ImportTargetEntity;

  @Column({ name: 'column_mapping', type: 'jsonb' })
  columnMapping: Array<{
    source: string;
    target: string;
    transformer?: string;
    required: boolean;
  }>;

  @Column({ name: 'validation_rules', type: 'jsonb', default: {} })
  validationRules: {
    requiredFields: string[];
    uniqueFields: string[];
    referentialChecks: boolean;
  };

  @Column({ name: 'duplicate_strategy', type: 'varchar', default: 'SKIP' })
  duplicateStrategy: 'SKIP' | 'UPDATE' | 'CREATE_NEW';

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}