import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * Categoria offerta. Discrimina fra offerte di rete fissa, rete mobile e
 * energia (luce/gas). Per retrocompat le offerte preesistenti ricevono
 * 'FIXED_LINE' come default.
 */
export type OfferCategory = 'FIXED_LINE' | 'MOBILE' | 'ENERGY';

@Entity('offers')
@Index(['category', 'provider'])
export class Offer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Categoria offerta:
   *  - FIXED_LINE: rete fissa (TIM, Vodafone, WindTre, Iliad, Optima, Iren, SKY)
   *  - MOBILE: rete mobile (TIM, Vodafone, WindTre, Iliad, Kena, Ho, Very, SKY Mobile ecc.)
   *  - ENERGY: luce e gas (Enel, Eni, Edison, A2A, Iren, ecc.)
   */
  @Column({
    type: 'enum',
    enum: ['FIXED_LINE', 'MOBILE', 'ENERGY'],
    default: 'FIXED_LINE',
  })
  category: OfferCategory;

  @Column({ length: 50 })
  provider: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 100 })
  canone: string;

  @Column({ length: 100, nullable: true })
  attivazione: string;

  @Column({ length: 100, nullable: true })
  vincolo: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ length: 100, nullable: true })
  disattivazione: string;

  @Column({ length: 20, default: 'consumer' })
  type: string;

  @Column({ length: 50, nullable: true })
  scadenza: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: 0 })
  sort_order: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
