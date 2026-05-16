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

  @Column({
    name: 'scope_type',
    type: 'varchar',
    length: 16,
    default: 'shop',
  })
  scopeType: CompetitionScope;

  @Column({ name: 'is_hidden', type: 'boolean', default: false })
  isHidden: boolean;

  @Column({
    name: 'selected_shop_ids',
    type: 'uuid',
    array: true,
    nullable: true,
  })
  selectedShopIds: string[] | null;

  @Column({ name: 'founder_compensation', type: 'decimal', precision: 14, scale: 2, default: 0 })
  founderCompensation: number;

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
