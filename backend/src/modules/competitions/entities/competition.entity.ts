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
 * Tappa 3 (originale): scope "shop" implicito, tenantId sempre valorizzato.
 * Tappa 3.1: aggiunto `scopeType` ('shop' | 'company'). Se 'company', la gara
 * conta i pezzi di TUTTI gli shop della stessa company. Il tenantId resta
 * popolato (= shop "creatore" / "owner") ma diventa info accessoria.
 *
 * Tappa 3.1: aggiunto `isHidden`. Se true, la gara è visibile solo a
 * FOUNDER e SUPER_ADMIN (utile per gare interne / test / bonus segreti).
 *
 * Tappa 3.2 (fix-final4): aggiunto `selectedShopIds`. Permette di creare gare
 * scope=company che includano SOLO un sottoinsieme degli shop della company
 * (es. company con 10 shop → 2 gare separate da 5 shop l'una). Quando
 * `scopeType=company` E `selectedShopIds` non è null/empty, la gara conta
 * solo i pezzi di QUEI shop. Se null/empty su scope=company → tutti gli shop
 * della company (comportamento legacy).
 */
export type CompetitionScope = 'shop' | 'company';

@Entity('competitions')
@Index(['tenantId', 'isActive'])
@Index(['tenantId', 'startDate'])
@Index(['templateKey'])
@Index(['companyId', 'scopeType'])
export class Competition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

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

  @Column({ name: 'is_auto_monthly', default: false })
  isAutoMonthly: boolean;

  @Column({ name: 'template_key', type: 'varchar', length: 80, nullable: true })
  templateKey: string | null;

  /** Tappa 3.1: 'shop' = solo questo shop, 'company' = tutti gli shop della company. */
  @Column({
    name: 'scope_type',
    type: 'varchar',
    length: 16,
    default: 'shop',
  })
  scopeType: CompetitionScope;

  /** Tappa 3.1: gara nascosta agli operator/admin. Solo FOUNDER+SUPER_ADMIN la vedono. */
  @Column({ name: 'is_hidden', type: 'boolean', default: false })
  isHidden: boolean;

  /**
   * Tappa 3.2: Sotto-selezione shop per gare scope=company.
   * NULL o array vuoto = tutti gli shop della company (default legacy).
   * Array di UUID = solo quegli shop partecipano alla gara.
   * Ignorato per scope=shop.
   */
  @Column({
    name: 'selected_shop_ids',
    type: 'uuid',
    array: true,
    nullable: true,
  })
  selectedShopIds: string[] | null;

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
