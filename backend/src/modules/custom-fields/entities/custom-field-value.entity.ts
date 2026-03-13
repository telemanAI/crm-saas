import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { CustomField } from './custom-field.entity';
import { User } from '../../users/entities/user.entity';

@Entity('custom_field_values')
@Index(['tenantId', 'entityType', 'entityId'])
@Index(['customFieldId'])
export class CustomFieldValue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'custom_field_id' })
  customFieldId: string;

  @ManyToOne(() => CustomField)
  @JoinColumn({ name: 'custom_field_id' })
  customField: CustomField;

  @Column({ name: 'entity_id' })
  entityId: string; // id del customer/lead/deal

  @Column({ name: 'entity_type', type: 'varchar', length: 50 })
  entityType: string;

  @Column({ name: 'value_text', type: 'text', nullable: true })
  valueText: string;

  @Column({ name: 'value_number', type: 'decimal', precision: 15, scale: 2, nullable: true })
  valueNumber: number;

  @Column({ name: 'value_boolean', nullable: true })
  valueBoolean: boolean;

  @Column({ name: 'value_date', type: 'date', nullable: true })
  valueDate: string;

  @Column({ name: 'value_datetime', type: 'timestamptz', nullable: true })
  valueDatetime: Date;

  @Column({ name: 'value_json', type: 'jsonb', nullable: true })
  valueJson: any; // per multiselect e dati complessi

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'updated_by' })
  updater: User;
}
