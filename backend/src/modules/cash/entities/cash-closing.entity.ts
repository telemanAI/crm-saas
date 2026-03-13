import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { CashRegister } from './cash-register.entity';
import { User } from '../../users/entities/user.entity';

@Entity('cash_closings')
export class CashClosing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'register_id' })
  registerId: string;

  @ManyToOne(() => CashRegister)
  @JoinColumn({ name: 'register_id' })
  register: CashRegister;

  @Column({ name: 'operator_id' })
  operatorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'operator_id' })
  operator: User;

  @Column({ name: 'opened_at' })
  openedAt: Date;

  @Column({ name: 'closed_at', nullable: true })
  closedAt: Date;

  @Column({ name: 'opening_balance', type: 'decimal', precision: 12, scale: 2 })
  openingBalance: number;

  @Column({ name: 'closing_balance', type: 'decimal', precision: 12, scale: 2 })
  closingBalance: number;

  @Column({ name: 'expected_balance', type: 'decimal', precision: 12, scale: 2 })
  expectedBalance: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  difference: number;

  @Column({ name: 'total_sales', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalSales: number;

  @Column({ name: 'total_refunds', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalRefunds: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'is_approved', default: false })
  isApproved: boolean;

  @Column({ name: 'created_at', default: () => 'NOW()' })
  createdAt: Date;
}
