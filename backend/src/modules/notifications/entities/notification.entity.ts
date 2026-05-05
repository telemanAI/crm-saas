import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum NotificationType {
  PRACTICE_COMPLETED = 'PRACTICE_COMPLETED',
  COMPETITION_COMPLETED = 'COMPETITION_COMPLETED',
  COMPETITION_REMINDER = 'COMPETITION_REMINDER',
  PRACTICE_STALE = 'PRACTICE_STALE',
}

@Entity('notifications')
@Index(['userId', 'isRead'])
@Index(['tenantId', 'createdAt'])
@Index(['companyId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  tenantId!: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  companyId!: string | null;

  @Column({ type: 'varchar', length: 36 })
  userId!: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.PRACTICE_COMPLETED,
  })
  type!: NotificationType;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  linkUrl!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  linkLabel!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @Column({ type: 'boolean', default: false })
  isRead!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
