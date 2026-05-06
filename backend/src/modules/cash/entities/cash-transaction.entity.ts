import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { CashRegister } from './cash-register.entity';
import { User } from '../../users/entities/user.entity';

@Entity('cash_transactions')
export class CashTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'register_id' })
  registerId: string;

  @ManyToOne(() => CashRegister)
  @JoinColumn({ name: 'register_id' })
  register: CashRegister;

  @Column({ name: 'transaction_type' })
  transactionType: string;

  @Column({ name: 'payment_method' })
  paymentMethod: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2 })
  totalAmount: number;

  @Column({ name: 'receipt_number', nullable: true })
  receiptNumber: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'operator_id' })
  operatorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'operator_id' })
  operator: User;

  @Column({ name: 'is_voided', default: false })
  isVoided: boolean;

  @Column({ name: 'created_at', default: () => 'NOW()' })
  createdAt: Date;
}
