import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('otp_codes')
@Index(['email'])
export class OtpCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 255, name: 'code_hash' })
  codeHash: string;

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'boolean', default: false })
  used: boolean;

  @Column({ type: 'int', default: 0, name: 'attempt_count' })
  attemptCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}