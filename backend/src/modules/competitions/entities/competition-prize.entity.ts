import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Competition } from './competition.entity';

/**
 * Premio a scaglioni per una gara.
 *
 * Es. "Raggiunto target 2000 pezzi → 1500€", "2300 pezzi → 2000€".
 *
 * Lo `scope` definisce CHI riceve il premio:
 *  - COMPANY  → tutta la company (somma tutte le entries delle gare con stesso templateKey)
 *  - SHOP     → solo questo shop (somma entries di QUESTA gara)
 *  - OPERATOR → ogni singolo operatore che individualmente raggiunge la soglia
 *
 * `kind`:
 *  - PIECES   → soglia espressa in pezzi (default)
 *  - REVENUE  → soglia espressa in € (riservato per future estensioni "punti monetari")
 */
export type PrizeScope = 'COMPANY' | 'SHOP' | 'OPERATOR';
export type PrizeKind = 'PIECES' | 'REVENUE';

/**
 * Categoria del premio, per gestire i premi separati per
 * - PRATICHE rete fissa
 * - PRATICHE mobile
 * - PRATICHE energy
 * - DISPOSITIVI
 * - GLOBALE (tutte le pratiche+vendite messe insieme)
 * - CUSTOM (es. "Telepass": serve `targetId` legato)
 */
export type PrizeCategory = 'FIXED_LINE' | 'MOBILE' | 'ENERGY' | 'DEVICE' | 'GLOBAL' | 'CUSTOM';

@Entity('competition_prizes')
@Index(['competitionId', 'scope'])
@Index(['competitionId', 'sortOrder'])
export class CompetitionPrize {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'competition_id', type: 'uuid' })
  competitionId: string;

  @ManyToOne(() => Competition, (c) => c.prizes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'competition_id' })
  competition: Competition;

  @Column({ length: 200 })
  label: string;

  @Column({ type: 'varchar', length: 16, default: 'OPERATOR' })
  scope: PrizeScope;

  @Column({ type: 'varchar', length: 16, default: 'PIECES' })
  kind: PrizeKind;

  @Column({ type: 'varchar', length: 16, default: 'GLOBAL' })
  category: PrizeCategory;

  /**
   * Per category=CUSTOM, ID del target a cui è agganciato il premio
   * (es. premio "Telepass": targetId=<uuid del target Telepass>).
   */
  @Column({ name: 'target_id', type: 'uuid', nullable: true })
  targetId: string | null;

  /** Soglia di sblocco (pezzi o € in base a `kind`). */
  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  threshold: number;

  /** Valore monetario opzionale del premio (per stat). */
  @Column({ name: 'prize_value', type: 'numeric', precision: 14, scale: 2, nullable: true })
  prizeValue: number | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
