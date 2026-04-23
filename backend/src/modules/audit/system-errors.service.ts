import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual, FindOptionsWhere } from 'typeorm';
import { SystemError } from './entities/system-error.entity';

export interface LogErrorParams {
  tenantId?: string | null;
  userId?: string | null;
  statusCode: number;
  method: string;
  endpoint: string;
  errorMessage?: string | null;
  errorName?: string | null;
  stackTrace?: string | null;
  severity?: 'error' | 'warning' | 'info';
  metadata?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface ListErrorsParams {
  tenantId?: string;
  userId?: string;
  statusCode?: number;
  severity?: 'error' | 'warning' | 'info';
  endpoint?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export interface ShopHealthSummary {
  tenantId: string;
  tenantName: string;
  subscriptionCode: string;
  total24h: number;
  total7d: number;
  errors24h: number;
  warnings24h: number;
  lastErrorAt: Date | null;
  topEndpoints: Array<{ endpoint: string; count: number }>;
}

@Injectable()
export class SystemErrorsService {
  private readonly logger = new Logger('SystemErrorsService');

  constructor(
    @InjectRepository(SystemError)
    private readonly repo: Repository<SystemError>,
  ) {}

  /**
   * Persiste un errore di sistema. Best-effort: non solleva mai, non
   * deve bloccare la risposta al client.
   */
  async logError(params: LogErrorParams): Promise<SystemError | null> {
    try {
      // Trima lo stack trace per evitare tabelle gonfie
      const trimmedStack = params.stackTrace?.slice(0, 8000) || null;
      const trimmedMessage = params.errorMessage?.slice(0, 2000) || null;

      const row = this.repo.create({
        tenantId: params.tenantId || null,
        userId: params.userId || null,
        statusCode: params.statusCode,
        method: params.method,
        endpoint: params.endpoint?.slice(0, 500) || 'unknown',
        errorMessage: trimmedMessage,
        errorName: params.errorName?.slice(0, 200) || null,
        stackTrace: trimmedStack,
        severity: params.severity || 'error',
        metadata: params.metadata ?? null,
        ipAddress: params.ipAddress?.slice(0, 64) || null,
        userAgent: params.userAgent?.slice(0, 500) || null,
        createdAt: new Date(),
      });
      return await this.repo.save(row);
    } catch (err: any) {
      this.logger.error(`[system-errors] Log failed: ${err?.message}`);
      return null;
    }
  }

  async listErrors(
    params: ListErrorsParams,
  ): Promise<{ items: SystemError[]; total: number }> {
    const where: FindOptionsWhere<SystemError> = {};
    if (params.tenantId) where.tenantId = params.tenantId;
    if (params.userId) where.userId = params.userId;
    if (params.statusCode) where.statusCode = params.statusCode;
    if (params.severity) where.severity = params.severity;
    if (params.endpoint) where.endpoint = params.endpoint;

    if (params.from && params.to) {
      where.createdAt = Between(params.from, params.to);
    } else if (params.from) {
      where.createdAt = MoreThanOrEqual(params.from);
    } else if (params.to) {
      where.createdAt = LessThanOrEqual(params.to);
    }

    const [items, total] = await this.repo.findAndCount({
      where,
      relations: ['tenant', 'user'],
      order: { createdAt: 'DESC' },
      take: Math.min(params.limit ?? 100, 500),
      skip: params.offset ?? 0,
    });
    return { items, total };
  }

  /**
   * Aggregazione "salute negozi": per ogni tenant, conteggio errori
   * nelle ultime 24h/7g, top endpoint che fallisce, ultimo errore.
   * Usato dal pannello SUPER_ADMIN per identificare negozi in difficoltà.
   */
  async getShopsHealth(): Promise<ShopHealthSummary[]> {
    const now = new Date();
    const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const past7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Query aggregata con JOIN al tenant. Usiamo QueryBuilder per avere
    // COUNT raggruppato + sub-select. Filtriamo solo tenant con almeno 1
    // errore negli ultimi 7 giorni (altri sono "sani" e non ci interessano).
    const raw = await this.repo
      .createQueryBuilder('e')
      .leftJoin('e.tenant', 't')
      .select('e.tenant_id', 'tenantId')
      .addSelect('t.name', 'tenantName')
      .addSelect('t.subscription_code', 'subscriptionCode')
      .addSelect('COUNT(*) FILTER (WHERE e.created_at >= :past24h)', 'total24h')
      .addSelect('COUNT(*)', 'total7d')
      .addSelect(
        "COUNT(*) FILTER (WHERE e.created_at >= :past24h AND e.severity = 'error')",
        'errors24h',
      )
      .addSelect(
        "COUNT(*) FILTER (WHERE e.created_at >= :past24h AND e.severity = 'warning')",
        'warnings24h',
      )
      .addSelect('MAX(e.created_at)', 'lastErrorAt')
      .where('e.created_at >= :past7d', { past7d })
      .andWhere('e.tenant_id IS NOT NULL')
      .setParameter('past24h', past24h)
      .groupBy('e.tenant_id')
      .addGroupBy('t.name')
      .addGroupBy('t.subscription_code')
      .orderBy('"total24h"', 'DESC')
      .addOrderBy('"total7d"', 'DESC')
      .getRawMany();

    // Per ogni tenant, prendi i top-3 endpoint che falliscono.
    const summaries: ShopHealthSummary[] = [];
    for (const r of raw) {
      const top = await this.repo
        .createQueryBuilder('e')
        .select('e.endpoint', 'endpoint')
        .addSelect('COUNT(*)', 'count')
        .where('e.tenant_id = :tid', { tid: r.tenantId })
        .andWhere('e.created_at >= :past7d', { past7d })
        .groupBy('e.endpoint')
        .orderBy('count', 'DESC')
        .limit(3)
        .getRawMany();

      summaries.push({
        tenantId: r.tenantId,
        tenantName: r.tenantName || 'Sconosciuto',
        subscriptionCode: r.subscriptionCode || '',
        total24h: parseInt(r.total24h, 10) || 0,
        total7d: parseInt(r.total7d, 10) || 0,
        errors24h: parseInt(r.errors24h, 10) || 0,
        warnings24h: parseInt(r.warnings24h, 10) || 0,
        lastErrorAt: r.lastErrorAt ? new Date(r.lastErrorAt) : null,
        topEndpoints: top.map((t) => ({
          endpoint: t.endpoint,
          count: parseInt(t.count, 10) || 0,
        })),
      });
    }
    return summaries;
  }
}
