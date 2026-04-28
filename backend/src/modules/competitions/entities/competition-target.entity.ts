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
 * Riga di target dentro una gara.
 *
 * Es. "TIM+KENA MNP target 30 pezzi", "SKY target 1600", "TELEPASS target 10".
 *
 * Il match della pratica → target avviene per:
 *  - category (FIXED_LINE/MOBILE/ENERGY/DEVICE)
 *  - matchProviders: lista di provider (case-insensitive). Vuoto = qualsiasi.
 *  - matchOfferKeywords: lista di parole chiave nel nome offerta.
 *    Es. ["MNP"] matcha "TIM POWER MNP", "KENA MNP MOBILE", ecc.
 *  - matchPracticeTypes: opzionale, es. ["consumer"] o ["business"]
 *
 * Una pratica può matchare PIU' target (= entries multiple per la stessa pratica
 * nella stessa gara). Esempio richiesto dall'utente: target "TIM+KENA MNP" e
 * target "MNP totale" possono coesistere e venire matchati entrambi.
 */
export type TargetCategory = 'FIXED_LINE' | 'MOBILE' | 'ENERGY' | 'DEVICE' | 'CUSTOM';

@Entity('competition_targets')
@Index(['competitionId', 'sortOrder'])
@Index(['competitionId', 'category'])
export class CompetitionTarget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'competition_id', type: 'uuid' })
  competitionId: string;

  @ManyToOne(() => Competition, (c) => c.targets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'competition_id' })
  competition: Competition;

  @Column({ length: 200 })
  label: string;

  @Column({ type: 'varchar', length: 32, default: 'CUSTOM' })
  category: TargetCategory;

  /** Provider da matchare (vuoto = qualunque). Salvati come uppercase. */
  @Column({ name: 'match_providers', type: 'jsonb', default: () => `'[]'::jsonb` })
  matchProviders: string[];

  /** Keyword da cercare nel nome offerta (uppercase, case-insensitive sul match). */
  @Column({ name: 'match_offer_keywords', type: 'jsonb', default: () => `'[]'::jsonb` })
  matchOfferKeywords: string[];

  /** Tipi pratica da matchare (consumer/business). Vuoto = entrambi. */
  @Column({ name: 'match_practice_types', type: 'jsonb', default: () => `'[]'::jsonb` })
  matchPracticeTypes: string[];

  @Column({ name: 'target_pieces', type: 'int', default: 0 })
  targetPieces: number;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
