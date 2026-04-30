import { Entity, PrimaryGeneratedColumn, Column, Index, Unique } from 'typeorm';

/**
 * Pezzo assegnato a un operatore in una gara.
 *
 * UN'unica entry rappresenta UN match pratica/vendita ↔ target. Per la stessa
 * pratica possono esistere PIU' entries, una per ogni target matchante (anche
 * in gare diverse).
 *
 * Usato per:
 *  - calcolare la classifica per shop / per operator
 *  - sommare i pezzi per ogni target
 *  - calcolare il totale company (join su tutte le competitions con stesso templateKey)
 *
 * Vincolo unique: 1 entry per (competition_id, target_id, source_type, source_id, user_id).
 *  - source_type/source_id: PRACTICE/<uuid> oppure DEVICE_SALE/<uuid movement>
 *
 * Cambio venditore (soldBy): facciamo DELETE + INSERT con il nuovo userId.
 * Eliminazione pratica: facciamo DELETE delle entries.
 */
export type EntrySourceType = 'PRACTICE' | 'DEVICE_SALE';
export type EntryCategory = 'FIXED_LINE' | 'MOBILE' | 'ENERGY' | 'DEVICE';

@Entity('competition_entries')
@Index(['tenantId', 'competitionId'])
@Index(['competitionId', 'targetId'])
@Index(['userId', 'createdAt'])
@Index(['sourceType', 'sourceId'])
@Unique(['competitionId', 'targetId', 'sourceType', 'sourceId', 'userId'])
export class CompetitionEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string | null;

  @Column({ name: 'competition_id', type: 'uuid' })
  competitionId: string;

  @Column({ name: 'target_id', type: 'uuid', nullable: true })
  targetId: string | null;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'source_type', type: 'varchar', length: 16 })
  sourceType: EntrySourceType;

  @Column({ name: 'source_id', type: 'uuid' })
  sourceId: string;

  @Column({ type: 'varchar', length: 16 })
  category: EntryCategory;

  @Column({ length: 100, nullable: true })
  provider: string | null;

  @Column({ name: 'offer_name', length: 255, nullable: true })
  offerName: string | null;

  /** Numero pezzi (default 1, ma terreniamo flessibilità per future estensioni). */
  @Column({ type: 'int', default: 1 })
  pieces: number;

  /**
   * Valore monetario opzionale (es. prezzo vendita per device sales,
   * o canone offerta per pratiche). Riservato per estensioni future.
   */
  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  revenue: number | null;

  /**
   * TAPPA 3.1 — Shop denormalizzato per query report cross-shop.
   * Coincide con tenantId per le pratiche, ma è esplicito per chiarezza.
   */
  @Column({ name: 'shop_id', type: 'uuid', nullable: true })
  shopId: string | null;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'NOW()' })
  createdAt: Date;
}
