
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * Stato temporaneo per utenti che hanno completato il social login
 * ma non hanno ancora completato la registrazione (scelta ruolo + nome negozio/codice).
 * Token short-lived (15 min) salvato nel redirect.
 */
@Entity('pending_registrations')
@Index(['token'], { unique: true })
@Index(['email'])
export class PendingRegistration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  token: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({
    type: 'enum',
    enum: ['google', 'facebook', 'otp'],
  })
  provider: 'google' | 'facebook' | 'otp';

  @Column({ type: 'varchar', length: 255, name: 'provider_id', nullable: true })
  providerId: string | null;

  @Column({ type: 'varchar', length: 100, name: 'first_name', nullable: true })
  firstName: string | null;

  @Column({ type: 'varchar', length: 100, name: 'last_name', nullable: true })
  lastName: string | null;

  @Column({ type: 'text', name: 'avatar_url', nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
