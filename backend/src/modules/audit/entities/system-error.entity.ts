import { Entity, Column, PrimaryGeneratedColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Tracciamento degli errori di sistema (5xx e 4xx notevoli) per negozio.
 * Diverso da AuditLog: quello tiene chi ha fatto cosa, questo tiene che
 * cosa NON ha funzionato. Usato dal SUPER_ADMIN per vedere la salute
 * operativa di ogni negozio.
 */
@Entity('system_errors')
@Index(['tenantId', 'createdAt'])
@Index(['statusCode'])
@Index(['createdAt'])
export class SystemError {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Tenant legato all'errore. Null solo per errori pre-autenticazione
   * (es. token invalido, health check fallito).
   */
  @Column({ type: 'uuid', name: 'tenant_id', nullable: true })
  tenantId: string | null;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant | null;

  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'status_code', type: 'int' })
  statusCode: number;

  @Column({ type: 'varchar', length: 10 })
  method: string; // GET/POST/PUT/DELETE/PATCH

  @Column({ type: 'varchar', length: 500 })
  endpoint: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  /**
   * Classe dell'eccezione (ForbiddenException, BadRequestException, ecc.)
   * utile per raggruppare per "tipo" nella UI di monitoring.
   */
  @Column({ name: 'error_name', type: 'varchar', length: 200, nullable: true })
  errorName: string | null;

  @Column({ name: 'stack_trace', type: 'text', nullable: true })
  stackTrace: string | null;

  /**
   * Livello di severità:
   *   error    → 5xx o eccezioni inattese
   *   warning  → 4xx non 401/403 (input invalido, conflitti)
   *   info     → 401/403 ripetuti dallo stesso utente (possibile brute force)
   */
  @Column({ type: 'varchar', length: 20, default: 'error' })
  severity: 'error' | 'warning' | 'info';

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  userAgent: string | null;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'NOW()' })
  createdAt: Date;
}
