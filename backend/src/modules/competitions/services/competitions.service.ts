import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Competition } from '../entities/competition.entity';
import { CompetitionTarget } from '../entities/competition-target.entity';
import { CompetitionPrize } from '../entities/competition-prize.entity';
import { CompetitionEntry } from '../entities/competition-entry.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import { Practice } from '../../practices/entities/practice.entity';
import { Offer } from '../../offers/entities/offer.entity';
import { CompetitionEntriesService } from './competition-entries.service';
import {
  CreateCompetitionDto,
  UpdateCompetitionDto,
  CopyCompetitionDto,
  TargetDto,
  PrizeDto,
} from '../dto/competition.dto';

@Injectable()
export class CompetitionsService {
  constructor(
    @InjectRepository(Competition)
    private readonly compRepo: Repository<Competition>,
    @InjectRepository(CompetitionTarget)
    private readonly targetRepo: Repository<CompetitionTarget>,
    @InjectRepository(CompetitionPrize)
    private readonly prizeRepo: Repository<CompetitionPrize>,
    @InjectRepository(CompetitionEntry)
    private readonly entryRepo: Repository<CompetitionEntry>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Practice)
    private readonly practiceRepo: Repository<Practice>,
    @InjectRepository(Offer)
    private readonly offerRepo: Repository<Offer>,
    private readonly dataSource: DataSource,
    private readonly entriesService: CompetitionEntriesService,
  ) {}

  // ===================== READ =====================

  async findAll(
    tenantId: string,
    includeInactive = false,
    opts?: { companyId?: string | null; isFounder?: boolean },
  ): Promise<Competition[]> {
    const qb = this.compRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.targets', 't')
      .leftJoinAndSelect('c.prizes', 'p');

    // Tappa 3.1: include gare scope=company della stessa company + scope=shop dello shop attivo
    if (opts?.companyId) {
      qb.where(
        '(c.tenantId = :tenantId OR (c.scopeType = :company AND c.companyId = :companyId))',
        { tenantId, company: 'company', companyId: opts.companyId },
      );
    } else {
      qb.where('c.tenantId = :tenantId', { tenantId });
    }

    if (!includeInactive) qb.andWhere('c.isActive = true');
    // Tappa 3.1: gare nascoste visibili solo a founder/super-admin
    if (!opts?.isFounder) qb.andWhere('c.isHidden = false');

    qb.orderBy('c.startDate', 'DESC')
      .addOrderBy('t.sortOrder', 'ASC')
      .addOrderBy('p.sortOrder', 'ASC');
    return qb.getMany();
  }

  async findOne(tenantId: string, id: string): Promise<Competition> {
    const c = await this.compRepo.findOne({
      where: { id, tenantId },
      relations: ['targets', 'prizes'],
    });
    if (!c) throw new NotFoundException('Gara non trovata');
    if (c.targets) c.targets.sort((a, b) => a.sortOrder - b.sortOrder);
    if (c.prizes) c.prizes.sort((a, b) => a.sortOrder - b.sortOrder);
    return c;
  }

  // ===================== CREATE =====================

  async create(
    tenantId: string,
    createdBy: string,
    dto: CreateCompetitionDto,
  ): Promise<Competition> {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const id = await this.dataSource.transaction(async (manager) => {
      const compRepo = manager.getRepository(Competition);
      const tRepo = manager.getRepository(CompetitionTarget);
      const pRepo = manager.getRepository(CompetitionPrize);

      const comp = compRepo.create({
        tenantId,
        companyId: tenant?.companyId ?? null,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        startDate: new Date(dto.startDate) as any,
        endDate: new Date(dto.endDate) as any,
        isActive: dto.isActive ?? true,
        templateKey: dto.templateKey?.trim() || null,
        scopeType: dto.scopeType ?? 'shop',           // Tappa 3.1
        isHidden: dto.isHidden ?? false,              // Tappa 3.1
        // Tappa 3.2: sotto-selezione shop per gare company
        selectedShopIds:
          dto.scopeType === 'company' && Array.isArray(dto.selectedShopIds) && dto.selectedShopIds.length
            ? dto.selectedShopIds
            : null,
        createdById: createdBy,
      });
      const saved = await compRepo.save(comp);

      if (dto.targets?.length) {
        const targets = dto.targets.map((t, i) => this.makeTarget(t, saved.id, i, tRepo));
        await tRepo.save(targets);
      }
      if (dto.prizes?.length) {
        const prizes = dto.prizes.map((p, i) => this.makePrize(p, saved.id, i, pRepo));
        await pRepo.save(prizes);
      }
      return saved.id;
    });

    // Tappa 3.1: ricalcolo retroattivo automatico — assegna pezzi storici alla nuova gara
    try {
      await this.entriesService.recomputeCompetition(id);
    } catch (err) {
      console.warn('[create competition] recompute failed', err);
    }

    return this.findOne(tenantId, id);
  }

  // ===================== UPDATE =====================

  async update(
    tenantId: string,
    id: string,
    dto: UpdateCompetitionDto,
  ): Promise<Competition> {
    await this.dataSource.transaction(async (manager) => {
      const compRepo = manager.getRepository(Competition);
      const tRepo = manager.getRepository(CompetitionTarget);
      const pRepo = manager.getRepository(CompetitionPrize);

      const c = await compRepo.findOne({ where: { id, tenantId } });
      if (!c) throw new NotFoundException('Gara non trovata');

      if (dto.title !== undefined) c.title = dto.title.trim();
      if (dto.description !== undefined) c.description = dto.description?.trim() || null;
      if (dto.startDate) c.startDate = new Date(dto.startDate) as any;
      if (dto.endDate) c.endDate = new Date(dto.endDate) as any;
      if (dto.isActive !== undefined) c.isActive = dto.isActive;
      if (dto.scopeType !== undefined) c.scopeType = dto.scopeType;       // Tappa 3.1
      if (dto.isHidden !== undefined) c.isHidden = dto.isHidden;          // Tappa 3.1
      // Tappa 3.2: aggiorna sotto-selezione shop (se scope diventa shop, azzera)
      if (dto.selectedShopIds !== undefined) {
        c.selectedShopIds =
          (dto.scopeType ?? c.scopeType) === 'company' && dto.selectedShopIds.length
            ? dto.selectedShopIds
            : null;
      } else if (dto.scopeType === 'shop') {
        c.selectedShopIds = null;
      }
      if (dto.templateKey !== undefined) c.templateKey = dto.templateKey?.trim() || null;
      await compRepo.save(c);

      if (dto.targets !== undefined) {
        // Strategy: replace tutto (targets sono "leggeri"). Per UX migliore in
        // futuro si potrà fare diff per id.
        const existing = await tRepo.find({ where: { competitionId: id } });
        if (existing.length) await tRepo.remove(existing);
        if (dto.targets.length) {
          const targets = dto.targets.map((t, i) => this.makeTarget(t, id, i, tRepo));
          await tRepo.save(targets);
        }
      }
      if (dto.prizes !== undefined) {
        const existing = await pRepo.find({ where: { competitionId: id } });
        if (existing.length) await pRepo.remove(existing);
        if (dto.prizes.length) {
          const prizes = dto.prizes.map((p, i) => this.makePrize(p, id, i, pRepo));
          await pRepo.save(prizes);
        }
      }
    });

    // Tappa 3.1: ricalcolo retroattivo dopo update
    try {
      await this.entriesService.recomputeCompetition(id);
    } catch (err) {
      console.warn('[update competition] recompute failed', err);
    }

    return this.findOne(tenantId, id);
  }

  // ===================== DELETE =====================

  async remove(tenantId: string, id: string): Promise<{ message: string }> {
    const c = await this.compRepo.findOne({ where: { id, tenantId } });
    if (!c) throw new NotFoundException('Gara non trovata');
    // Cascade rimuove targets + prizes; entries vanno rimossi a parte (no CASCADE FK)
    await this.entryRepo.delete({ competitionId: id });
    await this.compRepo.remove(c);
    return { message: 'Gara eliminata' };
  }

  // ===================== COPY =====================

  /**
   * Copia una gara dallo shop di origine a un altro shop dello stesso founder.
   * Mantiene lo stesso `templateKey` per permettere aggregazioni company-wide.
   */
  async copyToShop(
    sourceTenantId: string,
    sourceCompetitionId: string,
    userId: string,
    dto: CopyCompetitionDto,
    userIsFounderOnTargetShop: () => Promise<boolean>,
  ): Promise<Competition> {
    if (sourceTenantId === dto.targetShopId) {
      throw new BadRequestException('Lo shop di destinazione deve essere diverso da quello di origine');
    }
    const allowed = await userIsFounderOnTargetShop();
    if (!allowed) {
      throw new ForbiddenException(
        'Devi essere FOUNDER (o ADMIN con canManageCompetitions) anche sullo shop di destinazione',
      );
    }

    const source = await this.findOne(sourceTenantId, sourceCompetitionId);
    const targetTenant = await this.tenantRepo.findOne({ where: { id: dto.targetShopId } });
    if (!targetTenant) throw new NotFoundException('Shop di destinazione non trovato');

    const newTemplateKey =
      source.templateKey || `copy-${source.id.slice(0, 8)}-${Date.now()}`;
    // Aggiorna il templateKey della source se non l'aveva
    if (!source.templateKey) {
      source.templateKey = newTemplateKey;
      await this.compRepo.save(source);
    }

    const newId = await this.dataSource.transaction(async (manager) => {
      const compRepo = manager.getRepository(Competition);
      const tRepo = manager.getRepository(CompetitionTarget);
      const pRepo = manager.getRepository(CompetitionPrize);

      const newComp = compRepo.create({
        tenantId: dto.targetShopId,
        companyId: targetTenant.companyId,
        title: source.title,
        description: source.description,
        startDate: source.startDate,
        endDate: source.endDate,
        isActive: true,
        isAutoMonthly: false,
        templateKey: newTemplateKey,
        scopeType: source.scopeType ?? 'shop',     // Tappa 3.1
        isHidden: source.isHidden ?? false,         // Tappa 3.1
        createdById: userId,
      });
      const saved = await compRepo.save(newComp);

      if (dto.copyTargets !== false && source.targets?.length) {
        const newTargets = source.targets.map((t, i) =>
          tRepo.create({
            competitionId: saved.id,
            label: t.label,
            category: t.category,
            // Tappa 3.1
            targetType: t.targetType ?? 'specific',
            provider: t.provider ?? null,
            offerIds: [...(t.offerIds || [])],
            inventoryItemIds: [...(t.inventoryItemIds || [])],
            // Backward compat
            matchProviders: [...(t.matchProviders || [])],
            matchOfferKeywords: [...(t.matchOfferKeywords || [])],
            matchPracticeTypes: [...(t.matchPracticeTypes || [])],
            targetPieces: t.targetPieces,
            sortOrder: t.sortOrder ?? i,
          }),
        );
        await tRepo.save(newTargets);
      }
      if (dto.copyPrizes !== false && source.prizes?.length) {
        const newPrizes = source.prizes.map((p, i) =>
          pRepo.create({
            competitionId: saved.id,
            label: p.label,
            scope: p.scope,
            kind: p.kind,
            category: p.category,
            targetId: null, // i target sono nuovi → l'eventuale link va riallineato a mano
            threshold: p.threshold,
            prizeValue: p.prizeValue,
            sortOrder: p.sortOrder ?? i,
          }),
        );
        await pRepo.save(newPrizes);
      }
      return saved.id;
    });

    // Tappa 3.1: anche la gara copiata fa recompute (per popolare le entries
    // sullo shop di destinazione con le sue pratiche del periodo)
    try {
      await this.entriesService.recomputeCompetition(newId);
    } catch (err) {
      console.warn('[copy competition] recompute failed', err);
    }

    return this.findOne(dto.targetShopId, newId);
  }

  // ===================== LEADERBOARD / DASHBOARD =====================

  /**
   * Calcola la classifica dettagliata di una gara:
   *  - per target: pezzi totali e divisi per operatore
   *  - per operator: classifica generale
   *  - per shop (se la gara ha templateKey, somma anche su altri shop)
   */
  async getLeaderboard(tenantId: string, competitionId: string) {
    const comp = await this.findOne(tenantId, competitionId);

    // Tutte le entries di questa gara
    const entries = await this.entryRepo.find({ where: { competitionId } });

    // Per target: aggregati pezzi
    const byTarget: Record<string, { targetId: string | null; pieces: number; revenue: number }> = {};
    const byOperator = new Map<string, { userId: string; pieces: number; revenue: number }>();
    let totalPieces = 0;
    let totalRevenue = 0;

    for (const e of entries) {
      const tk = e.targetId || '__no_target__';
      if (!byTarget[tk]) byTarget[tk] = { targetId: e.targetId, pieces: 0, revenue: 0 };
      byTarget[tk].pieces += e.pieces;
      byTarget[tk].revenue += Number(e.revenue || 0);

      const op = byOperator.get(e.userId) || { userId: e.userId, pieces: 0, revenue: 0 };
      op.pieces += e.pieces;
      op.revenue += Number(e.revenue || 0);
      byOperator.set(e.userId, op);

      totalPieces += e.pieces;
      totalRevenue += Number(e.revenue || 0);
    }

    // Entries gemelle su altri shop (templateKey)
    let companyAggregate: any = null;
    if (comp.templateKey) {
      const sibling = await this.compRepo.find({
        where: { templateKey: comp.templateKey, companyId: comp.companyId ?? null as any },
      });
      const siblingIds = sibling.map((s) => s.id);
      if (siblingIds.length > 1) {
        const allEntries = await this.entryRepo.find({
          where: { competitionId: In(siblingIds) },
        });
        const byShop: Record<string, { tenantId: string; pieces: number; revenue: number }> = {};
        for (const e of allEntries) {
          if (!byShop[e.tenantId]) byShop[e.tenantId] = { tenantId: e.tenantId, pieces: 0, revenue: 0 };
          byShop[e.tenantId].pieces += e.pieces;
          byShop[e.tenantId].revenue += Number(e.revenue || 0);
        }
        companyAggregate = {
          siblingCompetitionIds: siblingIds,
          totalPieces: allEntries.reduce((s, e) => s + e.pieces, 0),
          totalRevenue: allEntries.reduce((s, e) => s + Number(e.revenue || 0), 0),
          byShop: Object.values(byShop),
        };
      }
    }

    return {
      competition: {
        id: comp.id,
        title: comp.title,
        startDate: comp.startDate,
        endDate: comp.endDate,
        isActive: comp.isActive,
        templateKey: comp.templateKey,
      },
      targets: comp.targets.map((t) => ({
        id: t.id,
        label: t.label,
        category: t.category,
        targetPieces: t.targetPieces,
        currentPieces: byTarget[t.id]?.pieces || 0,
        progressPercent:
          t.targetPieces > 0
            ? Math.round(((byTarget[t.id]?.pieces || 0) / t.targetPieces) * 1000) / 10
            : null,
      })),
      prizes: comp.prizes.map((p) => ({
        id: p.id,
        label: p.label,
        scope: p.scope,
        category: p.category,
        threshold: Number(p.threshold),
        prizeValue: p.prizeValue !== null ? Number(p.prizeValue) : null,
        targetId: p.targetId,
      })),
      operatorRanking: await this.enrichOperatorRanking(
        Array.from(byOperator.values()).sort((a, b) => b.pieces - a.pieces),
      ),
      totals: {
        pieces: totalPieces,
        revenue: Math.round(totalRevenue * 100) / 100,
        entriesCount: entries.length,
      },
      companyAggregate,
      // Lista dettagliata pratiche-pezzo (per dropdown UI):
      // ogni entry = una pratica con offerta, gestore, venditore, data
      practiceBreakdown: await this.buildPracticeBreakdown(entries),
    };
  }

  /**
   * Arricchisce ogni riga del ranking con firstName/lastName risolti dal DB
   * direttamente, senza dipendere da endpoint esterni `/users/team`.
   * Funziona anche per founder/admin di altri shop in scope COMPANY.
   */
  private async enrichOperatorRanking(
    rows: Array<{ userId: string; pieces: number; revenue: number }>,
  ): Promise<Array<any>> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.userId);
    const users = await this.userRepo.find({
      where: { id: In(ids) },
      select: ['id', 'firstName', 'lastName', 'email'],
    });
    const map = new Map(users.map((u) => [u.id, u]));
    return rows.map((r, idx) => {
      const u = map.get(r.userId);
      return {
        ...r,
        rank: idx + 1,
        firstName: u?.firstName ?? null,
        lastName: u?.lastName ?? null,
        email: u?.email ?? null,
        displayName: u
          ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email
          : `Utente eliminato`,
      };
    });
  }

  /**
   * Per ogni entry, carica la pratica corrispondente (sourceType=PRACTICE)
   * e risolve venditore + offerta + cliente + shop. Output usato dal dropdown
   * UI per mostrare "quale promo è stata fatta per riempire la gara, da chi
   * e per quale cliente".
   */
  private async buildPracticeBreakdown(entries: CompetitionEntry[]): Promise<Array<any>> {
    const practiceIds = entries
      .filter((e) => e.sourceType === 'PRACTICE' && e.sourceId)
      .map((e) => e.sourceId as string);
    if (practiceIds.length === 0) return [];

    // Usiamo QueryBuilder per evitare di dover importare Customer entity in
    // questo service: facciamo un raw join opzionale su customers (per nome).
    const practices = await this.practiceRepo
      .createQueryBuilder('p')
      .leftJoin('customers', 'c', 'c.id = p.customer_id')
      .select([
        'p.id AS id',
        'p.tenant_id AS "tenantId"',
        'p.type AS type',
        'p.category AS category',
        'p.offer_name AS "offerName"',
        'p.offer_code AS "offerCode"',
        'p.offer_id AS "offerId"',
        'p.sold_by_id AS "soldById"',
        'p.customer_id AS "customerId"',
        'p.created_at AS "createdAt"',
        'p.status AS status',
        'p.operational_status AS "operationalStatus"',
        'TRIM(CONCAT(COALESCE(c.first_name, \'\'), \' \', COALESCE(c.last_name, \'\'))) AS "customerName"',
      ])
      .where('p.id IN (:...ids)', { ids: practiceIds })
      .getRawMany();

    const sellerIds = Array.from(
      new Set(practices.map((p) => p.soldById).filter(Boolean) as string[]),
    );
    const sellers = await this.userRepo.find({
      where: { id: In(sellerIds.length ? sellerIds : ['00000000-0000-0000-0000-000000000000']) },
      select: ['id', 'firstName', 'lastName', 'email'],
    });
    const sellerMap = new Map(sellers.map((u) => [u.id, u]));

    const offerIds = Array.from(
      new Set(practices.map((p) => p.offerId).filter(Boolean) as string[]),
    );
    const offers = await this.offerRepo.find({
      where: { id: In(offerIds.length ? offerIds : ['00000000-0000-0000-0000-000000000000']) },
      select: ['id', 'name', 'provider'],
    });
    const offerMap = new Map(offers.map((o) => [o.id, o]));

    // Risolvi i nomi degli shop (gare scope=company → entries di shop diversi)
    const shopIds = Array.from(
      new Set(practices.map((p) => p.tenantId).filter(Boolean) as string[]),
    );
    const shops = await this.tenantRepo.find({
      where: { id: In(shopIds.length ? shopIds : ['00000000-0000-0000-0000-000000000000']) },
      select: ['id', 'name'],
    });
    const shopMap = new Map(shops.map((t) => [t.id, t.name]));

    return entries
      .filter((e) => e.sourceType === 'PRACTICE' && e.sourceId)
      .map((e) => {
        const p = practices.find((x) => x.id === e.sourceId);
        const seller = p?.soldById ? sellerMap.get(p.soldById) : null;
        const offer = p?.offerId ? offerMap.get(p.offerId) : null;
        return {
          entryId: e.id,
          targetId: e.targetId,
          pieces: e.pieces,
          revenue: Number(e.revenue || 0),
          practiceId: p?.id ?? null,
          practiceCreatedAt: p?.createdAt ?? null,
          provider: offer?.provider ?? p?.type ?? null,
          offerName: offer?.name ?? p?.offerName ?? null,
          category: p?.category ?? null,
          status: p?.status ?? null,
          operationalStatus: p?.operationalStatus ?? null,
          sellerId: p?.soldById ?? null,
          sellerName: seller
            ? `${seller.firstName ?? ''} ${seller.lastName ?? ''}`.trim() || seller.email
            : 'Sconosciuto',
          // Tappa 3.2 — cliente e shop di vendita
          customerId: p?.customerId ?? null,
          customerName: p?.customerName?.trim() || null,
          shopId: p?.tenantId ?? null,
          shopName: p?.tenantId ? shopMap.get(p.tenantId) ?? null : null,
        };
      });
  }

  // ===================== HELPERS =====================

  private makeTarget(
    dto: TargetDto,
    competitionId: string,
    sortIdx: number,
    repo: Repository<CompetitionTarget>,
  ): CompetitionTarget {
    return repo.create({
      competitionId,
      label: dto.label.trim(),
      category: dto.category,
      // Tappa 3.1: nuovi campi
      targetType: dto.targetType ?? 'specific',
      provider: dto.provider?.trim() || null,
      offerIds: Array.isArray(dto.offerIds) ? dto.offerIds : [],
      inventoryItemIds: Array.isArray(dto.inventoryItemIds) ? dto.inventoryItemIds : [],
      // Backward compat Tappa 3
      matchProviders: (dto.matchProviders || []).map((s) => s.trim().toUpperCase()),
      matchOfferKeywords: (dto.matchOfferKeywords || []).map((s) => s.trim().toUpperCase()),
      matchPracticeTypes: dto.matchPracticeTypes || [],
      targetPieces: dto.targetPieces,
      sortOrder: dto.sortOrder ?? sortIdx,
    });
  }

  private makePrize(
    dto: PrizeDto,
    competitionId: string,
    sortIdx: number,
    repo: Repository<CompetitionPrize>,
  ): CompetitionPrize {
    return repo.create({
      competitionId,
      label: dto.label.trim(),
      scope: dto.scope,
      kind: dto.kind || 'PIECES',
      category: dto.category || 'GLOBAL',
      targetId: dto.targetId || null,
      threshold: dto.threshold,
      prizeValue: dto.prizeValue ?? null,
      sortOrder: dto.sortOrder ?? sortIdx,
    });
  }
}
