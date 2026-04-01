import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'varchar', length: 100, name: 'first_name', nullable: true })
  firstName: string;

  @Column({ type: 'varchar', length: 100, name: 'last_name', nullable: true })
  lastName: string;

  @Column({ type: 'varchar', length: 50, name: 'phone', nullable: true })
  phone: string;

  // Role: SUPER_ADMIN (no tenant), ADMIN/FOUNDER/OPERATOR (con tenant)
  @Column({
    type: 'enum',
    enum: ['SUPER_ADMIN', 'ADMIN', 'FOUNDER', 'OPERATOR'],
    default: 'OPERATOR',
  })
  role: 'SUPER_ADMIN' | 'ADMIN' | 'FOUNDER' | 'OPERATOR';

  // Relazione tenant (null per Super Admin)
  @Column({ type: 'uuid', name: 'tenant_id', nullable: true })
  tenantId: string | null;

  @ManyToOne(() => Tenant, tenant => tenant.id, { nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant | null;

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

  // Timestamp
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}