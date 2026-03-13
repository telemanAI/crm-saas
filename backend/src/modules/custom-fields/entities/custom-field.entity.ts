import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';

export type FieldType = 'text' | 'number' | 'date' | 'datetime' | 'boolean' | 'select' | 'multiselect' | 'textarea' | 'email' | 'url' | 'currency';

@Entity('custom_fields')
export class CustomField {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'entity_type', type: 'varchar', length: 50 })
  entityType: string;

  @Column({ name: 'field_name', type: 'varchar', length: 100 })
  fieldName: string;

  @Column({ name: 'field_label', type: 'varchar', length: 200 })
  fieldLabel: string;

  @Column({ name: 'field_type', type: 'enum', enum: ['text', 'number', 'date', 'datetime', 'boolean', 'select', 'multiselect', 'textarea', 'email', 'url', 'currency'] })
  fieldType: FieldType;

  @Column({ type: 'jsonb', nullable: true })
  options: {
    choices?: string[];
    min?: number;
    max?: number;
  };

  @Column({ name: 'validation_rules', type: 'jsonb', nullable: true })
  validationRules: {
    min?: number;
    max?: number;
    regex?: string;
    customMessage?: string;
  };

  @Column({ name: 'is_required', default: false })
  isRequired: boolean;

  @Column({ name: 'default_value', nullable: true })
  defaultValue: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  placeholder: string;

  @Column({ name: 'help_text', type: 'varchar', length: 500, nullable: true })
  helpText: string;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_searchable', default: true })
  isSearchable: boolean;

  @Column({ name: 'is_filterable', default: true })
  isFilterable: boolean;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
