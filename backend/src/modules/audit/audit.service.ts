import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

export interface LogActionParams {
  userId?: string | null;
  tenantId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: any;
  newValues?: any;
  metadata?: any;
}

export interface ListLogsParams {
  tenantId?: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger('AuditService');

  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  /**
   * Persiste un evento di audit. Mai lancia (best effort) per non bloccare
   * il flusso della richiesta principale se il logging fallisce.
   */
  async logAction(params: LogActionParams): Promise<AuditLog | null> {
    try {
      const log = this.repo.create({
        userId: params.userId || null,
        tenantId: params.tenantId || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        oldValues: params.oldValues ?? null,
        newValues: params.newValues ?? null,
        metadata: params.metadata ?? null,
        createdAt: new Date(),
      });
      return await this.repo.save(log);
    } catch (err: any) {
      this.logger.error(`[audit] Log failed: ${err?.message}`);
      return null;
    }
  }

  /**
   * Lista audit logs filtrabile. Usata sia da SUPER_ADMIN (tutti) sia dai
   * FOUNDER (solo per il loro tenantId attivo).
   */
  async listLogs(params: ListLogsParams): Promise<{ items: AuditLog[]; total: number }> {
    const where: FindOptionsWhere<AuditLog> = {};
    if (params.tenantId) where.tenantId = params.tenantId;
    if (params.userId) where.userId = params.userId;
    if (params.entityType) where.entityType = params.entityType;
    if (params.entityId) where.entityId = params.entityId;
    if (params.action) where.action = params.action;

    if (params.from && params.to) {
      where.createdAt = Between(params.from, params.to);
    } else if (params.from) {
      where.createdAt = MoreThanOrEqual(params.from);
    } else if (params.to) {
      where.createdAt = LessThanOrEqual(params.to);
    }

    const [items, total] = await this.repo.findAndCount({
      where,
      relations: ['user', 'tenant'],
      order: { createdAt: 'DESC' },
      take: Math.min(params.limit ?? 100, 500),
      skip: params.offset ?? 0,
    });
    return { items, total };
  }
}
