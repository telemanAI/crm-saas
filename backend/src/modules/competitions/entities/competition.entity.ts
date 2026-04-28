import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CompetitionTarget } from './competition-target.entity';
import { CompetitionPrize } from './competition-prize.entity';

/**
 * Gara (competition).
 *
 * Una gara appartiene a UNO shop (`tenantId`). Per gare multi-negozio si
 * duplica la gara su ciascuno shop tramite l'endpoint /competitions/:id/copy
 * (mantenendo lo stesso `templateKey` per query aggregate company-wide).
 *
 * Ogni shop ha le sue entries — il totale company-wide si calcola sommando
 * tutte le entries delle gare con lo stesso `templateKey`.
 */
@Entity('competitions')
@Index(['tenantId', 'isActive'])
@Index(['tenantId', 'startDate'])
@Index(['templateKey'])
export class Competition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  /** companyId snapshot per evitare join al volo (riallineato in caso di modifiche). */
  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string | null;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  /** True se generata automaticamente dal cron mensile. */
  @Column({ name: 'is_auto_monthly', default: false })
  isAutoMonthly: boolean;

  /**
   * Chiave logica della gara, usata per associare le copie su shop diversi.
   * Es. "AUTO-2026-04" per la gara mensile aprile, oppure "lancio-iliad-estate"
   * per una gara manuale duplicata.
   */
  @Column({ name: 'template_key', type: 'varchar', length: 80, nullable: true })
  templateKey: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById: string | null;

  @OneToMany(() => CompetitionTarget, (t) => t.competition, { cascade: true })
  targets: CompetitionTarget[];

  @OneToMany(() => CompetitionPrize, (p) => p.competition, { cascade: true })
  prizes: CompetitionPrize[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
