import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { User } from '../../users/entities/user.entity';

export type PracticeType = 'TIM_FIBRA' | 'VODAFONE' | 'WINDTRE' | 'ILIAD' | 'OPTIMA' | 'IREN' | 'SKY';
export type PracticeStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled';
export type OperationalStatus = 'PENDING' | 'IN_PROGRESS' | 'ACTIVATED' | 'REJECTED';

@Entity('practices')
@Index(['tenantId', 'createdAt'])
@Index(['customerId'])
export class Practice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'customer_id', nullable: true })
  customerId: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ name: 'assigned_to', nullable: true })
  assignedTo: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigned_to' })
  assignedUser: User;

  @Column({ type: 'enum', enum: ['TIM_FIBRA', 'VODAFONE', 'WINDTRE', 'ILIAD', 'OPTIMA', 'IREN', 'SKY'] })
  type: PracticeType;

  @Column({ type: 'enum', enum: ['draft', 'in_progress', 'completed', 'cancelled'], default: 'draft' })
  status: PracticeStatus;

  @Column({ type: 'enum', enum: ['PENDING', 'IN_PROGRESS', 'ACTIVATED', 'REJECTED'], default: 'PENDING', name: 'operational_status' })
  operationalStatus: OperationalStatus;

  @Column({ name: 'offer_code', nullable: true })
  offerCode: string;

  @Column({ name: 'offer_name', nullable: true })
  offerName: string;

  @Column({ name: 'offer_canone', nullable: true })
  offerCanone: string;

  @Column({ name: 'offer_attivazione', nullable: true })
  offerAttivazione: string;

  @Column({ name: 'offer_vincolo', nullable: true })
  offerVincolo: string;

  @Column({ name: 'offer_note', type: 'text', nullable: true })
  offerNote: string;

  @Column({ name: 'offer_disattivazione', nullable: true })
  offerDisattivazione: string;

  @Column({ name: 'offer_type', nullable: true })
  offerType: string;

  @Column({ name: 'offer_scadenza', nullable: true })
  offerScadenza: string;

  @Column({ name: 'sold_by', nullable: true })
  soldBy: string;

  @Column({ name: 'sold_by_id', nullable: true })
  soldById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'sold_by_id' })
  soldByUser: User;

  @Column({ name: 'entered_by', nullable: true })
  enteredBy: string;

  @Column({ name: 'entered_by_id', nullable: true })
  enteredById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'entered_by_id' })
  enteredByUser: User;

  @Column({ name: 'customer_snapshot', type: 'jsonb', default: {} })
  customerSnapshot: any;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'line_type', nullable: true })
  lineType: string;

  @Column({ name: 'installation_address', type: 'jsonb', default: {} })
  installationAddress: any;

  @Column({ name: 'technology', nullable: true })
  technology: string;

  @Column({ name: 'new_line_notes', type: 'text', nullable: true })
  newLineNotes: string;

  @Column({ name: 'old_line_data', type: 'jsonb', default: {} })
  oldLineData: any;

  @Column({ name: 'payment_method', type: 'jsonb', default: {} })
  paymentMethod: any;
  
  @Column({ name: 'privacy_data', type: 'jsonb', default: {} })
  privacyData: { gdprConsent?: boolean; marketingConsent?: boolean };

  @Column({ name: 'appointment_data', type: 'jsonb', nullable: true })
  appointmentData: { 
    data?: string; 
    ora?: string; 
    oraFine?: string;
    accordi?: string; 
    lavorazioniPost?: string; 
  };

  @Column({ name: 'notes_history', type: 'jsonb', nullable: true })
  notesHistory: Array<{ text: string; createdAt: Date; createdBy: string; createdById: string }>;

  @Column({ name: 'current_step', type: 'int', default: 1 })
  currentStep: number;

  @Column({ type: 'simple-array', default: '' })
  completedSteps: number[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}