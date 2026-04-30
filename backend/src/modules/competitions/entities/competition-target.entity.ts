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
 * TAPPA 3.1: ogni target ha un `targetType` esplicito che decide la logica
 * di match:
 *
 *  - 'category_generic'  → conta TUTTE le pratiche della categoria
 *                          (es. "Tutte le rete fissa target 50")
 *
 *  - 'provider_generic'  → conta tutte le pratiche di un provider in una categoria
 *                          (es. "Vodafone rete fissa target 30")
 *                          AUTO-INCLUDE: una nuova promo Vodafone aggiunta al
 *                          catalogo entra automaticamente al prossimo recompute.
 *
 *  - 'specific'          → conta solo le pratiche con offer_id ∈ offerIds
 *                          (es. dropdown multi-select "SKY WiFi" + "SKY WiFi+TV")
 *                          Il match è stabile: rinominare la promo non rompe nulla.
 *                          Quando in catalogo si aggiunge una nuova promo, il
 *                          founder deve aggiungerla manualmente al target.
 *
 * I vecchi campi matchProviders/matchOfferKeywords/matchPracticeTypes restano
 * per backward compat con i target Tappa 3 originale e per filtri opzionali
 * "type" (consumer/business) che si applicano sopra al target_type.
 */
export type TargetCategory = 'FIXED_LINE' | 'MOBILE' | 'ENERGY' | 'DEVICE' | 'CUSTOM';
export type TargetType = 'category_generic' | 'provider_generic' | 'specific';

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

  /** Tappa 3.1 — Tipo di target. Default 'specific' per backward compat. */
  @Column({
    name: 'target_type',
    type: 'varchar',
    length: 24,
    default: 'specific',
  })
  targetType: TargetType;

  /** Tappa 3.1 — Provider per target_type='provider_generic' (case-insensitive). */
  @Column({ type: 'varchar', length: 50, nullable: true })
  provider: string | null;

  /** Tappa 3.1 — Lista offerId per target_type='specific'. */
  @Column({ name: 'offer_ids', type: 'jsonb', default: () => `'[]'::jsonb` })
  offerIds: string[];

  /** Tappa 3.2 — Lista inventoryItemId per target su prodotti vendita. */
  @Column({
    name: 'inventory_item_ids',
    type: 'jsonb',
    default: () => `'[]'::jsonb`,
  })
  inventoryItemIds: string[];

  // ====== Backward-compat Tappa 3 ======

  @Column({ name: 'match_providers', type: 'jsonb', default: () => `'[]'::jsonb` })
  matchProviders: string[];

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
