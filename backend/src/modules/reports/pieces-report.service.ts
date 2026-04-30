import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Practice } from '../practices/entities/practice.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { Offer } from '../offers/entities/offer.entity';

/**
 * TAPPA 3.1 — Service per "Report Pezzi" indipendente dalle gare.
 *
 * Filosofia: ogni pratica ACTIVATED non importata e con soldBy = 1 pezzo
 * per quel venditore. Questo report è la fotografia della performance
 * mensile della shop / company, indipendente da quante gare ci sono.
 *
 * Il pezzo "vendita dispositivi" arriverà in Tappa 3.2 (inventory_sales).
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
  ) {}

  /**
   * Riporta i pezzi del periodo, raggruppati per operatore + (opzionale) categoria.
   *
   * @param scope: 'shop' = solo tenantId; 'company' = tutti i tenant della company
   * @param tenantId: shop attivo (sempre richiesto)
   * @param companyId: opzionale; se scope=company è obbligatorio
   * @param from: data inizio (YYYY-MM-DD) - default = primo del mese corrente
   * @param to: data fine (YYYY-MM-DD) - default = oggi
   * @param category?: filtro categoria (FIXED_LINE/MOBILE/ENERGY/...)
   * @param provider?: filtro provider testuale (case-insensitive)
   * @param operatorId?: limitato a un solo operatore (utile per "i miei pezzi")
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
  }) {
    const from = params.from || this.firstOfThisMonth();
    const to = params.to || this.today();

    const shopIds = await this.resolveShopIds(params);

    const qb = this.practiceRepo
      .createQueryBuilder('p')
      .leftJoinAndMapOne('p.offer', Offer, 'o', 'o.id = p.offerId')
      .leftJoinAndMapOne('p.seller', User, 'u', 'u.id = p.soldById')
      .where('p.tenantId IN (:...shopIds)', { shopIds })
      .andWhere('p.operationalStatus = :st', { st: 'ACTIVATED' })
      .andWhere('p.sourceImportJobId IS NULL')
      .andWhere('p.soldById IS NOT NULL')
      .andWhere('p.createdAt >= :from', { from })
      .andWhere('p.createdAt <= :to', { to: `${to} 23:59:59` });

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

    const practices = await qb.getMany();

    // Aggrega per operatore × (shop, categoria, provider)
    const map = new Map<
      string,
      {
        userId: string;
        userName: string;
        userEmail: string | null;
        shopId: string;
        breakdown: Record<string, number>;
        total: number;
      }
    >();

    for (const p of practices) {
      const userId = p.soldById!;
      const seller = (p as any).seller as User | undefined;
      const offer = (p as any).offer as Offer | undefined;
      const cat = (p.category || 'FIXED_LINE') as string;
      const prov =
        (offer?.provider || p.offerType || p.type || '?').toString().toUpperCase();
      const breakdownKey = `${cat}|${prov}`;

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
          total: 0,
        };
        map.set(k, row);
      }
      row.breakdown[breakdownKey] = (row.breakdown[breakdownKey] || 0) + 1;
      row.total += 1;
    }

    const rows = Array.from(map.values()).sort((a, b) => b.total - a.total);
    const grandTotal = rows.reduce((s, r) => s + r.total, 0);

    return {
      from,
      to,
      scope: params.scope,
      filters: {
        category: params.category || null,
        provider: params.provider || null,
        operatorId: params.operatorId || null,
      },
      grandTotal,
      rows,
    };
  }

  /** "I miei pezzi del mese" per il widget dashboard operator. */
  async getMyPieces(userId: string, tenantId: string) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    return this.getPieces({
      scope: 'shop',
      tenantId,
      companyId: tenant?.companyId ?? null,
      operatorId: userId,
      from: this.firstOfThisMonth(),
      to: this.today(),
    });
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
