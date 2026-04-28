import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

export type AuthProvider = 'local' | 'google' | 'facebook' | 'otp';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  // ⚠️ NULLABLE per utenti social-only/OTP-only che non hanno password
  @Column({ type: 'varchar', length: 255, name: 'password_hash', nullable: true })
  passwordHash: string | null;

  @Column({ type: 'varchar', length: 100, name: 'first_name', nullable: true })
  firstName: string;

  @Column({ type: 'varchar', length: 100, name: 'last_name', nullable: true })
  lastName: string;

  @Column({ type: 'varchar', length: 50, name: 'phone', nullable: true })
  phone: string;

  // Role: SUPER_ADMIN (no tenant), ADMIN/FOUNDER/OPERATOR (con tenant)
  // NOTA: il ruolo sull'entity User è quello \"primario\" (retrocompat). Il ruolo
  // effettivo per ciascuno shop è in user_shop_memberships.role.
  @Column({
    type: 'enum',
    enum: ['SUPER_ADMIN', 'ADMIN', 'FOUNDER', 'OPERATOR'],
    default: 'OPERATOR',
  })
  role: 'SUPER_ADMIN' | 'ADMIN' | 'FOUNDER' | 'OPERATOR';

  // Relazione tenant PRIMARIO (null per Super Admin, o per utenti social pre-onboarding)
  // Kept for backward compatibility. La fonte di verità multi-shop è user_shop_memberships.
  @Column({ type: 'uuid', name: 'tenant_id', nullable: true })
  tenantId: string | null;

  @ManyToOne(() => Tenant, tenant => tenant.id, { nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant | null;

  // ===== NUOVO: ultimo shop attivo (persistenza tra sessioni) =====
  // Memorizza l'ultimo shop che l'utente ha selezionato nello switcher.
  // Al login viene riusato come default (se la membership è ancora attiva),
  // altrimenti si fallisce indietro a tenantId / primo shop disponibile.
  @Column({ type: 'uuid', name: 'last_active_shop_id', nullable: true })
  lastActiveShopId: string | null;

  // Stato utente
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'must_change_password', default: false })
  mustChangePassword: boolean;

  @Column({ name: 'last_login', nullable: true })
  lastLogin: Date;

  // Verifica email
  @Column({ type: 'boolean', default: false, name: 'email_verified' })
  emailVerified: boolean;

  @Column({ type: 'varchar', length: 255, name: 'verification_token', nullable: true })
  verificationToken: string | null;

  @Column({ type: 'timestamp', name: 'verification_token_expires', nullable: true })
  verificationTokenExpires: Date | null;

  // ===== NUOVI CAMPI: Social / OTP auth =====
  @Column({
    type: 'enum',
    enum: ['local', 'google', 'facebook', 'otp'],
    default: 'local',
  })
  provider: AuthProvider;

  // ID utente fornito dal provider social (Google sub, Facebook id)
  @Column({ type: 'varchar', length: 255, name: 'provider_id', nullable: true })
  providerId: string | null;

  @Column({ type: 'text', name: 'avatar_url', nullable: true })
  avatarUrl: string | null;

  // Timestamp
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
