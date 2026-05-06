import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { User } from '../../users/entities/user.entity';

@Entity('sales_practices')
export class SalesPractice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'customer_id' })
  customerId: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'operator_id' })
  operatorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'operator_id' })
  operator: User;

  @Column({ name: 'practice_type' })
  practiceType: string;

  @Column({ name: 'practice_code', unique: true })
  practiceCode: string;

  @Column()
  status: string;

  @Column({ type: 'jsonb', default: {} })
  practiceData: any;

  @Column({ type: 'jsonb', array: true, default: [] })
  statusHistory: any[];

  @Column({ name: 'total_value', type: 'decimal', precision: 12, scale: 2, nullable: true })
  totalValue: number;

  @Column({ name: 'commission_value', type: 'decimal', precision: 12, scale: 2, nullable: true })
  commissionValue: number;

  @Column({ nullable: true })
  outcome: string;

  @Column({ name: 'outcome_reason', nullable: true })
  outcomeReason: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'created_at', default: () => 'NOW()' })
  createdAt: Date;

  @Column({ name: 'updated_at', default: () => 'NOW()' })
  updatedAt: Date;
}
