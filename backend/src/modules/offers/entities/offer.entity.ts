
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('offers')
export class Offer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  provider: string; // TIM, Vodafone, WindTre, Iliad, Optima, Iren, SKY

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
  type: string; // consumer | business

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