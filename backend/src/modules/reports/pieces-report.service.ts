import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Practice } from '../practices/entities/practice.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { Offer } from '../offers/entities/offer.entity';
import { Customer } from '../customers/entities/customer.entity';

/**
 * TAPPA 3.1 — Service per "Report Pezzi" indipendente dalle gare.
 *
 * Filosofia: ogni pratica non importata e con soldBy = 1 pezzo
 * per quel venditore. A differenza della logica gare, qui mostriamo
 * TUTTI gli stati (con breakdown) così l'utente vede la fotografia
 * reale del periodo (in lavorazione, attivate, KO, annullate, ecc.).
 *
 * Filtro opzionale: `statuses` (CSV) per restringere agli stati voluti.
 */
@Injectable()
export class PiecesReportService {
  constructor(
    @InjectRepository(Practice)
    private readonly practiceRepo: Repository<Practice>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Offer)
    private readonly offerRepo: Repository<Offer>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  /**
   * Riporta i pezzi del periodo, raggruppati per operatore + (opzionale) categoria.
   *
   * @param scope: 'shop' | 'company'
   * @param tenantId: shop attivo (sempre richiesto)
   * @param companyId: opzionale; se scope=company è obbligatorio
   * @param from / to: range date (YYYY-MM-DD)
   * @param category, provider, operatorId: filtri
   * @param statuses: array (o CSV) di status logici da includere. Default: tutti.
   *                  Valori possibili: 'completed', 'in_progress', 'draft', 'cancelled'
   * @param includePractices: se true allega l'elenco pratiche raw (con id, customer, status...)
   */
  async getPieces(params: {
    scope: 'shop' | 'company';
    tenantId: string;
    companyId?: string | null;
    from?: string;
    to?: string;
    category?: string;
    provider?: string;
    operatorId?: string;
    statuses?: string[] | string;
    includePractices?: boolean;
  }) {
    const from = params.from || this.firstOfThisMonth();
    const to = params.to || this.today();

    const shopIds = await this.resolveShopIds(params);

    const statusList = this.normalizeStatuses(params.statuses);

    const qb = this.practiceRepo
      .createQueryBuilder('p')
      .leftJoinAndMapOne('p.offer', Offer, 'o', 'o.id = p.offerId')
      .leftJoinAndMapOne('p.seller', User, 'u', 'u.id = p.soldById')
      .leftJoinAndMapOne('p.customerInfo', Customer, 'c', 'c.id = p.customerId')
      .where('p.tenantId IN (:...shopIds)', { shopIds })
      .andWhere('p.sourceImportJobId IS NULL')
      .andWhere('p.soldById IS NOT NULL')
      .andWhere('p.createdAt >= :from', { from })
      .andWhere('p.createdAt <= :to', { to: `${to} 23:59:59` });

    if (statusList && statusList.length > 0) {
      qb.andWhere('p.status IN (:...statuses)', { statuses: statusList });
    }

    if (params.category) {
      qb.andWhere('p.category = :cat', { cat: params.category.toUpperCase() });
    }
    if (params.provider) {
      const provUpper = params.provider.toUpperCase();
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('UPPER(o.provider) = :prov', { prov: provUpper })
            .orWhere('UPPER(p.type) = :prov', { prov: provUpper })
            .orWhere('UPPER(p.offerType) = :prov', { prov: provUpper });
        }),
      );
    }
    if (params.operatorId) {
      qb.andWhere('p.soldById = :opId', { opId: params.operatorId });
    }

    qb.orderBy('p.createdAt', 'DESC');

    const practices = await qb.getMany();

    // Aggrega per operatore
    type Row = {
      userId: string;
      userName: string;
      userEmail: string | null;
      shopId: string;
      breakdown: Record<string, number>;
      statusBreakdown: Record<string, number>; // 'completed' | 'in_progress' | ...
      total: number;
    };

    const map = new Map<string, Row>();

    // Aggregato globale per status (top-level)
    const globalStatusBreakdown: Record<string, number> = {};
    const globalCategoryBreakdown: Record<string, number> = {};
    const globalProviderBreakdown: Record<string, number> = {};

    for (const p of practices) {
      const userId = p.soldById!;
      const seller = (p as any).seller as User | undefined;
      const offer = (p as any).offer as Offer | undefined;
      const cat = (p.category || 'FIXED_LINE') as string;
      const prov =
        (offer?.provider || p.offerType || p.type || '?').toString().toUpperCase();
      const breakdownKey = `${cat}|${prov}`;
      const statusKey = (p.status || 'draft') as string;

      const k = `${userId}|${p.tenantId}`;
      let row = map.get(k);
      if (!row) {
        const name = seller
          ? [seller.firstName, seller.lastName].filter(Boolean).join(' ').trim() ||
            seller.email ||
            userId.slice(0, 8)
          : userId.slice(0, 8);
        row = {
          userId,
          userName: name,
          userEmail: seller?.email || null,
          shopId: p.tenantId,
          breakdown: {},
          statusBreakdown: {},
          total: 0,
        };
        map.set(k, row);
      }
      row.breakdown[breakdownKey] = (row.breakdown[breakdownKey] || 0) + 1;
      row.statusBreakdown[statusKey] = (row.statusBreakdown[statusKey] || 0) + 1;
      row.total += 1;

      globalStatusBreakdown[statusKey] = (globalStatusBreakdown[statusKey] || 0) + 1;
      globalCategoryBreakdown[cat] = (globalCategoryBreakdown[cat] || 0) + 1;
      globalProviderBreakdown[prov] = (globalProviderBreakdown[prov] || 0) + 1;
    }

    const rows = Array.from(map.values()).sort((a, b) => b.total - a.total);
    const grandTotal = rows.reduce((s, r) => s + r.total, 0);

    // Mappa shopId → shopName (sempre, ci serve anche per le pratiche)
    const shopNames = new Map<string, string>();
    if (params.scope === 'company' && params.companyId) {
      const tenants = await this.tenantRepo.find({
        where: { companyId: params.companyId },
        select: ['id', 'name'],
      });
      tenants.forEach((t) => shopNames.set(t.id, t.name));
    } else {
      const tenant = await this.tenantRepo.findOne({ where: { id: params.tenantId } });
      if (tenant) shopNames.set(tenant.id, tenant.name);
    }

    const result: any = {
      from,
      to,
      scope: params.scope,
      filters: {
        category: params.category || null,
        provider: params.provider || null,
        operatorId: params.operatorId || null,
        statuses: statusList,
      },
      grandTotal,
      statusBreakdown: globalStatusBreakdown,
      categoryBreakdown: globalCategoryBreakdown,
      providerBreakdown: globalProviderBreakdown,
      rows,
    };

    if (params.includePractices) {
      result.practices = practices.map((p) => {
        const offer = (p as any).offer as Offer | undefined;
        const seller = (p as any).seller as User | undefined;
        const customer = (p as any).customerInfo as Customer | undefined;
        const sellerName = seller
          ? [seller.firstName, seller.lastName].filter(Boolean).join(' ').trim() || seller.email
          : p.soldById?.slice(0, 8) || '?';
        const customerName = customer
          ? [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() ||
            customer.email ||
            null
          : null;
        return {
          id: p.id,
          offerName: p.offerName || null,
          provider: (offer?.provider || p.offerType || p.type || null)?.toString().toUpperCase() || null,
          category: p.category || null,
          type: p.type || null,
          status: p.status || null,
          operationalStatus: p.operationalStatus || null,
          skyTvStatus: p.skyTvStatus || null,
          customerId: p.customerId || null,
          customerName,
          createdAt: p.createdAt,
          shopId: p.tenantId,
          shopName: shopNames.get(p.tenantId) || p.tenantId.slice(0, 8),
          sellerId: p.soldById,
          sellerName,
        };
      });
    }

    return result;
  }

  /** "I miei pezzi del mese" per il widget dashboard operator.
   * Mantiene il vecchio comportamento (solo pratiche completed) per coerenza
   * con la dashboard e con le gare.
   */
  async getMyPieces(userId: string, tenantId: string, includePractices?: boolean) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    return this.getPieces({
      scope: 'shop',
      tenantId,
      companyId: tenant?.companyId ?? null,
      operatorId: userId,
      from: this.firstOfThisMonth(),
      to: this.today(),
      statuses: ['completed'],
      includePractices,
    });
  }

  private normalizeStatuses(s?: string[] | string): string[] {
    if (!s) return [];
    const arr = Array.isArray(s) ? s : String(s).split(',');
    const valid = new Set(['draft', 'in_progress', 'completed', 'cancelled']);
    return arr
      .map((x) => String(x).trim().toLowerCase())
      .filter((x) => valid.has(x));
  }

  private async resolveShopIds(params: {
    scope: 'shop' | 'company';
    tenantId: string;
    companyId?: string | null;
  }): Promise<string[]> {
    if (params.scope === 'company' && params.companyId) {
      const tenants = await this.tenantRepo.find({
        where: { companyId: params.companyId },
        select: ['id'],
      });
      return tenants.map((t) => t.id);
    }
    return [params.tenantId];
  }

  private firstOfThisMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
