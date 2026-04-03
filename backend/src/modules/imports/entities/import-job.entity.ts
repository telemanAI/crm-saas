import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';

// ✅ AGGIUNTI: paused e rolled_back
export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'paused' | 'rolled_back';

// ✅ AGGIUNTO: UNIFIED_IMPORT
export type ImportTargetEntity = 'CUSTOMER_ONLY' | 'FIXED_LINE_PRACTICE' | 'MOBILE_PRACTICE' | 'ENERGY_PRACTICE' | 'UNIFIED_IMPORT';

@Entity('import_jobs')
export class ImportJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ name: 'target_entity', type: 'varchar' })
  targetEntity: ImportTargetEntity;

  @Column({ name: 'file_name' })
  fileName: string;

  @Column({ name: 'file_path' })
  filePath: string;

  @Column({ name: 'file_size' })
  fileSize: number;

  // ✅ AGGIUNTO: formato file
  @Column({ name: 'file_format', type: 'varchar', default: 'flat' })
  fileFormat: string;

  @Column({ type: 'enum', enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'paused', 'rolled_back'], default: 'pending' })
  status: ImportStatus;

  @Column({ name: 'template_id', nullable: true })
  templateId: string;

  @Column({ name: 'mapping_config', type: 'jsonb', default: {} })
  mappingConfig: {
    columns: Array<{
      source: string;
      target: string;
      transformer?: string;
    }>;
    duplicateStrategy: 'SKIP' | 'UPDATE' | 'CREATE_NEW';
  };

  // ✅ AGGIUNTI: matchedByCache e matchedByDB
  @Column({ name: 'stats', type: 'jsonb', default: {} })
  stats: {
    totalRows: number;
    processedRows: number;
    successfulRows: number;
    failedRows: number;
    skippedRows: number;
    createdCustomers: number;
    updatedCustomers: number;
    createdPractices: number;
    matchedByCache?: number;
    matchedByDB?: number;
  };

  // ✅ AGGIUNTO: timestamp negli errori
  @Column({ name: 'error_log', type: 'jsonb', default: [] })
  errorLog: Array<{
    row: number;
    error: string;
    rawData: any;
    level: 'error' | 'warning';
    timestamp?: string;
  }>;

  @Column({ name: 'validation_results', type: 'jsonb', nullable: true })
  validationResults: {
    valid: number;
    warnings: number;
    errors: number;
    preview: any[];
    summary?: {
      totalCustomers: number;
      customersWithPractice: number;
      newCustomers?: number;
      existingCustomers?: number;
    };
  };

  @Column({ name: 'started_at', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', nullable: true })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}