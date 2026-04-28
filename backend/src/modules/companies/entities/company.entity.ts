 
/**
 * Company = Ragione Sociale (azienda legale).
 * Una Company può avere N Shop (negozi fisici/virtuali).
 * Identificata univocamente dalla P.IVA (obbligatoria).
 *
 * NB: dalla Tappa 0 la P.IVA è OBBLIGATORIA e UNIQUE (vedi resolveOrCreateForNewShop).
 * Il vecchio unique composito (legalName, vatNumber) era buggato perché in PostgreSQL
 * NULL ≠ NULL e quindi due company con vatNumber=NULL non venivano viste come duplicate.
 */
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('companies')
@Index(['vatNumber'], { unique: true, where: '"vat_number" IS NOT NULL' })
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, name: 'legal_name' })
  legalName: string;

  @Column({ type: 'varchar', length: 50, name: 'vat_number', nullable: true })
  vatNumber: string | null;

  @Column({ type: 'uuid', name: 'owner_id' })
  ownerId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'jsonb', default: {}, name: 'billing_address' })
  billingAddress: any;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}