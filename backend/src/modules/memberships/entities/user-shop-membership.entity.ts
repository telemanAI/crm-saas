// backend/src/modules/memberships/entities/user-shop-membership.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

export type MembershipRole = 'FOUNDER' | 'ADMIN' | 'OPERATOR';

export interface MembershipPermissions {
  // ===== Clienti & Pratiche =====
  canViewAllCustomers?: boolean;
  canViewReports?: boolean;
  canCreatePractices?: boolean;
  canEditPractices?: boolean;
  canDeletePractices?: boolean;
  canEditCustomers?: boolean;
  canDeleteCustomers?: boolean;
  canExportData?: boolean;
  canImportData?: boolean;
  canManageCashRegister?: boolean;
  canChangeUserRoles?: boolean;

  // ===== Team (NUOVO — fix anomalia P1) =====
  canManageTeam?: boolean;

  // ===== Vendite & Gare (NUOVO — preparazione tappe successive) =====
  canViewCompetitions?: boolean;
  canManageCompetitions?: boolean;
  canViewProducts?: boolean;
  canManageProducts?: boolean;
  canSellDevices?: boolean;
  canViewAllDeviceSales?: boolean;
}

/**
 * Default permissions in base al ruolo.
 *
 * NB: ADMIN e FOUNDER hanno DEFAULT_PERMISSIONS identici per design:
 * l'ADMIN gestisce il negozio e poi sarà il FOUNDER a limitare i permessi
 * granulari di un singolo ADMIN se necessario.
 */
export const DEFAULT_PERMISSIONS: Record<MembershipRole, MembershipPermissions> = {
  FOUNDER: {
    canViewAllCustomers: true,
    canViewReports: true,
    canCreatePractices: true,
    canEditPractices: true,
    canDeletePractices: true,
    canEditCustomers: true,
    canDeleteCustomers: true,
    canExportData: true,
    canImportData: true,
    canManageCashRegister: true,
    canChangeUserRoles: true,
    canManageTeam: true,
    canViewCompetitions: true,
    canManageCompetitions: true,
    canViewProducts: true,
    canManageProducts: true,
    canSellDevices: true,
    canViewAllDeviceSales: true,
  },
  ADMIN: {
    canViewAllCustomers: true,
    canViewReports: true,
    canCreatePractices: true,
    canEditPractices: true,
    canDeletePractices: true,
    canEditCustomers: true,
    canDeleteCustomers: true,
    canExportData: true,
    canImportData: true,
    canManageCashRegister: true,
    canChangeUserRoles: true,
    canManageTeam: true,
    canViewCompetitions: true,
    canManageCompetitions: true,
    canViewProducts: true,
    canManageProducts: true,
    canSellDevices: true,
    canViewAllDeviceSales: true,
  },
  OPERATOR: {
    canViewAllCustomers: true,
    canViewReports: true,
    canCreatePractices: true,
    canEditPractices: true,
    canDeletePractices: false,
    canEditCustomers: true,
    canDeleteCustomers: false,
    canExportData: false,
    canImportData: false,
    canManageCashRegister: true,
    canChangeUserRoles: false,
    canManageTeam: false,
    canViewCompetitions: true,
    canManageCompetitions: false,
    canViewProducts: true,
    canManageProducts: false,
    canSellDevices: true,
    canViewAllDeviceSales: true,
  },
};

/**
 * Relazione M:N tra User e Shop (Tenant).
 * - isActive=false significa operatore rimosso (licenziato) ma storia conservata.
 * - permissions JSONB permette restrizioni granulari per singolo shop.
 * - endOfRelationshipNote = nota privata lasciata dall'admin alla rimozione, riutilizzabile per re-invito futuro.
 */
@Entity('user_shop_memberships')
@Unique(['userId', 'shopId'])
@Index(['userId'])
@Index(['shopId'])
export class UserShopMembership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid', name: 'shop_id' })
  shopId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shop_id' })
  shop: Tenant;

  @Column({
    type: 'enum',
    enum: ['FOUNDER', 'ADMIN', 'OPERATOR'],
    default: 'OPERATOR',
  })
  role: MembershipRole;

  @Column({ type: 'jsonb', default: {} })
  permissions: MembershipPermissions;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'uuid', name: 'invited_by', nullable: true })
  invitedBy: string | null;

  @Column({ type: 'timestamp', name: 'joined_at', default: () => 'CURRENT_TIMESTAMP' })
  joinedAt: Date;

  @Column({ type: 'timestamp', name: 'left_at', nullable: true })
  leftAt: Date | null;

  @Column({ type: 'text', name: 'end_of_relationship_note', nullable: true })
  endOfRelationshipNote: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}