import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Competition } from './competition.entity';

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

  @Column({
    name: 'target_type',
    type: 'varchar',
    length: 24,
    default: 'specific',
  })
  targetType: TargetType;

  @Column({ type: 'varchar', length: 50, nullable: true })
  provider: string | null;

  @Column({ name: 'offer_ids', type: 'jsonb', default: () => `'[]'::jsonb` })
  offerIds: string[];

  @Column({
    name: 'inventory_item_ids',
    type: 'jsonb',
    default: () => `'[]'::jsonb`,
  })
  inventoryItemIds: string[];

  @Column({ name: 'match_providers', type: 'jsonb', default: () => `'[]'::jsonb` })
  matchProviders: string[];

  @Column({ name: 'match_offer_keywords', type: 'jsonb', default: () => `'[]'::jsonb` })
  matchOfferKeywords: string[];

  @Column({ name: 'match_practice_types', type: 'jsonb', default: () => `'[]'::jsonb` })
  matchPracticeTypes: string[];

  @Column({ name: 'target_pieces', type: 'int', default: 0 })
  targetPieces: number;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'revenue_per_piece', type: 'decimal', precision: 14, scale: 2, default: 0 })
  revenuePerPiece: number;
}
