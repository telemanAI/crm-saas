
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { MembershipRole, MembershipPermissions } from '../../memberships/entities/user-shop-membership.entity';

export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

/**
 * Invite-link one-time per aggiungere operatori/admin ad uno Shop.
 * - token: UUID usato nell'URL (https://.../invite/<token>)
 * - scadenza configurabile (default 72h)
 * - riusabile: l'admin può rigenerare/reinviare finché non è ACCEPTED o REVOKED
 */
@Entity('invites')
@Index(['token'], { unique: true })
@Index(['shopId', 'email'])
export class Invite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  token: string;

  @Column({ type: 'uuid', name: 'shop_id' })
  shopId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shop_id' })
  shop: Tenant;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({
    type: 'enum',
    enum: ['FOUNDER', 'ADMIN', 'OPERATOR'],
    default: 'OPERATOR',
  })
  role: MembershipRole;

  @Column({ type: 'jsonb', default: {} })
  permissions: MembershipPermissions;

  @Column({ type: 'uuid', name: 'invited_by' })
  invitedBy: string;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'],
    default: 'PENDING',
  })
  status: InviteStatus;

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'timestamp', name: 'accepted_at', nullable: true })
  acceptedAt: Date | null;

  @Column({ type: 'uuid', name: 'accepted_by_user_id', nullable: true })
  acceptedByUserId: string | null;

  // Memo opzionale che l'admin può vedere durante il re-invito di un operatore storico
  @Column({ type: 'text', name: 'admin_note', nullable: true })
  adminNote: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
