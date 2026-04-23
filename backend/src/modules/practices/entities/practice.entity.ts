import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { User } from '../../users/entities/user.entity';

export type PracticeType = 'TIM_FIBRA' | 'VODAFONE' | 'WINDTRE' | 'ILIAD' | 'OPTIMA' | 'IREN' | 'SKY';
export type PracticeStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled';
export type OperationalStatus = 'PENDING' | 'IN_PROGRESS' | 'ACTIVATED' | 'REJECTED';

// Categoria pratica - distingue rete fissa, mobile e energia (luce/gas).
// Tutte le pratiche esistenti diventano FIXED_LINE di default.
export type PracticeCategory = 'FIXED_LINE' | 'MOBILE' | 'ENERGY';

export type StatoGlobale = 'completo' | 'non_completo' | null;

@Entity('practices')
@Index(['tenantId', 'createdAt'])
@Index(['customerId'])
@Index(['tenantId', 'category'])
export class Practice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  /**
   * Categoria pratica. Discriminator per separare i 3 flussi nel frontend
   * e in lista, pur riusando la stessa tabella (nessuna duplicazione di
   * customer snapshot, audit, operational status, notes history, ecc).
   */
  @Column({
    type: 'enum',
    enum: ['FIXED_LINE', 'MOBILE', 'ENERGY'],
    default: 'FIXED_LINE',
  })
  category: PracticeCategory;

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

  // Per FIXED_LINE il type è un enum ristretto; per MOBILE e ENERGY teniamo
  // il campo come stringa libera (il provider viene deciso dal wizard)
  // ma continuiamo a usare lo stesso campo per compatibilità con le query
  // esistenti (lista, export, report). Lato DB l'enum resta per backward
  // compat; validazione runtime deferita a service/DTO.
  @Column({ type: 'varchar', length: 50, nullable: true })
  type: PracticeType | string;

  @Column({ type: 'enum', enum: ['draft', 'in_progress', 'completed', 'cancelled'], default: 'draft' })
  status: PracticeStatus;

  @Column({ type: 'enum', enum: ['PENDING', 'IN_PROGRESS', 'ACTIVATED', 'REJECTED'], default: 'PENDING', name: 'operational_status' })
  operationalStatus: OperationalStatus;

  @Column({
    type: 'enum',
    enum: ['completo', 'non_completo'],
    nullable: true,
    name: 'stato_globale',
  })
  statoGlobale: StatoGlobale;

  @Column({
    name: 'convergenza',
    type: 'jsonb',
    nullable: true,
  })
  convergenza: {
    attiva: boolean;
    tipo: 'daChiudere' | 'chiusa' | null;
    numero?: string;
  } | null;

  @Column({
    name: 'lavorazioni_post_attivazione',
    type: 'text',
    nullable: true,
  })
  lavorazioniPostAttivazione: string | null;

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
  };

  @Column({ name: 'additional_packages', type: 'jsonb', nullable: true })
  additionalPackages?: {
    selectedIds: string[];
    totalPrice: number;
  };

  @Column({ nullable: true })
  createdByName: string;

  @Column({ nullable: true })
  assignedToName: string;

  @Column({ name: 'wash_config', type: 'jsonb', nullable: true })
  washConfig?: {
    enabled: boolean;
    type: 'suspect' | 'none';
    suspectData?: {
      clientCode: string;
      action: 'disattiva' | 'mantieni';
    };
    timestamp?: Date;
  };

  @Column({ name: 'notes_history', type: 'jsonb', nullable: true })
  notesHistory: Array<{ text: string; createdAt: Date; createdBy: string; createdById: string }>;

  @Column({ name: 'current_step', type: 'int', default: 1 })
  currentStep: number;

  @Column({ type: 'simple-array', default: '' })
  completedSteps: number[];

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

  /**
   * Dati specifici per pratiche MOBILE.
   * Campi principali: tipoLinea (MNP/DOPPIA_MNP/NUOVO_NUMERO),
   * numeroDaPortare, codiceFiscaleVecchiaLinea, gestoreProvenienza,
   * noteMnp, ricarica, timUnica, numeroReteFissaTimUnica, ibanCdc,
   * noteMetodoPagamento, noteGeneriche, accordiCliente.
   * Struttura aperta per evolvere senza migration pesanti.
   */
  @Column({ name: 'mobile_data', type: 'jsonb', nullable: true })
  mobileData?: {
    tipoLinea?: 'MNP' | 'DOPPIA_MNP' | 'NUOVO_NUMERO';
    numeroDaPortare?: string;
    codiceFiscaleVecchiaLinea?: string;
    gestoreProvenienza?: string;
    gestoreProvenienzaAltro?: string;
    noteMnp?: string;
    gestoreNuovaLinea?: string;
    gestoreNuovaLineaAltro?: string;
    ricarica?: 'DA_FARE' | 'DA_NON_FARE' | 'ALTRO';
    ricaricaAltro?: string;
    timUnica?: 'AGGANCIATA' | 'DA_AGGANCIARE' | 'NON_AGGANCIARE' | 'ALTRO';
    timUnicaAltro?: string;
    numeroReteFissaTimUnica?: string;
    ibanCdc?: string;
    noteMetodoPagamento?: string;
    noteGeneriche?: string;
    accordiCliente?: string;
    offertaAltro?: string;
  };

  /**
   * Dati specifici per pratiche ENERGY (luce/gas).
   * Campi principali: tipoAttivazione, numeroContatore (POD/PDR),
   * potenzaContatore, gestoreProvenienza, gestoreNuovoContratto,
   * tipoOfferta (VARIABILE/FISSA), ibanCdc, ecc.
   */
  @Column({ name: 'energy_data', type: 'jsonb', nullable: true })
  energyData?: {
    tipoAttivazione?:
      | 'LUCE_SWITCH'
      | 'LUCE_GAS_SWITCH'
      | 'LUCE_VOLTURA'
      | 'LUCE_SUBENTRO'
      | 'LUCE_POSA_NUOVO_CONTATORE'
      | 'GAS_SWITCH'
      | 'GAS_POSA_NUOVO_CONTATORE'
      | 'ALTRO';
    tipoAttivazioneAltro?: string;
    codiceFiscaleVecchioContratto?: string;
    numeroContatore?: string; // POD per LUCE, PDR per GAS
    potenzaContatore?: '1.5_KW' | '3_KW' | '4.5_KW' | '6_KW' | 'GAS' | 'ALTRO';
    potenzaContatoreAltro?: string;
    gestoreProvenienza?: string;
    gestoreProvenienzaAltro?: string;
    gestoreNuovoContratto?: string;
    gestoreNuovoContrattoAltro?: string;
    tipoOfferta?: 'VARIABILE' | 'FISSA' | 'ALTRO';
    tipoOffertaAltro?: string;
    ibanCdc?: string; // o "BOLLETTINO"
    noteMetodoPagamento?: string;
    noteGeneriche?: string;
    accordiCliente?: string;
  };
}
