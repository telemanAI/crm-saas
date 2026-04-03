import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ImportTargetEntity } from './import-job.entity';

@Entity('import_templates')
export class ImportTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'target_entity' })
  targetEntity: ImportTargetEntity;

  @Column({ name: 'column_mapping', type: 'jsonb' })
  columnMapping: Array<{
    source: string;
    target: string;
    transformer?: string;
    required: boolean;
  }>;

  @Column({ name: 'duplicate_strategy' })
  duplicateStrategy: 'SKIP' | 'UPDATE' | 'CREATE_NEW';

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'created_by' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}