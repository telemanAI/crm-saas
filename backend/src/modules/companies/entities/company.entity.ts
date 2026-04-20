 
/**
 * Company = Ragione Sociale (azienda legale).
 * Una Company può avere N Shop (negozi fisici/virtuali).
 * Identificata univocamente dalla combinazione legalName + vatNumber.
 */
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('companies')
@Index(['legalName', 'vatNumber'], { unique: true })
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