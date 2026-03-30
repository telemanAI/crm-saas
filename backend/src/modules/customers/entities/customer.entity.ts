import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ name: 'fiscal_code', nullable: true })
  fiscalCode: string;

  @Column({ name: 'vat_number', nullable: true })
  vatNumber: string;

  @Column({ name: 'phone_primary' })
  phonePrimary: string;

  @Column({ name: 'phone_secondary', nullable: true })
  phoneSecondary: string;

  @Column({ nullable: true })
  email: string;

  @Column({ type: 'jsonb', default: {} })
  address: any;

  @Column({ name: 'customer_segment', nullable: true })
  customerSegment: string;

  @Column({ name: 'assigned_to', nullable: true })
  assignedTo: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigned_to' })
  assignedUser: User;

  @Column({ default: 'active' })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes: string;
    @Column({ name: 'notes_history', type: 'jsonb', nullable: true })
  notesHistory: Array<{ text: string; createdAt: Date; createdBy: string; createdById: string }>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
  
    @Column({ name: 'source_import_job_id', type: 'uuid', nullable: true })
  sourceImportJobId: string;

  @Column({ name: 'import_metadata', type: 'jsonb', nullable: true })
  importMetadata: {
    originalRowNumber?: number;
    rawDataSnapshot?: any;
    validationOverrides?: string[];
  };
  

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
