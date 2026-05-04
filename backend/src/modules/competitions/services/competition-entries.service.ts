import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Brackets } from 'typeorm';
import { Competition } from '../entities/competition.entity';
import { CompetitionTarget, TargetType, TargetCategory } from '../entities/competition-target.entity';
import { CompetitionEntry, EntrySourceType, EntryCategory } from '../entities/competition-entry.entity';
import { Practice } from '../../practices/entities/practice.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Offer } from '../../offers/entities/offer.entity';
import { User } from '../../users/entities/user.entity';

/**
 * TAPPA 3.1 — Service Entries con due modalità complementari:
 *
 *  1) syncPracticeEntries(practiceId)        ← live, chiamato dagli hook PracticesService
 *     Aggiorna le entries di UNA pratica su tutte le gare attive.
 *
 *  2) recomputeCompetition(competitionId)    ← retroattivo, chiamato a creazione/modifica gara
 *     Cancella e ricrea TUTTE le entries scansionando le pratiche del periodo.
 *     Usato per: nuova gara con periodo che include pratiche già fatte,
 *     modifica target (aggiunta/rimozione promo), modifica scope shop↔company.
 *
 * Esclusione import: in entrambe le modalità, le pratiche con
 * `source_import_job_id` valorizzato vengono escluse (non contano per le gare).
 */

/**
 * Una pratica conta nella gara SOLO quando è "ESEGUITA" — cioè inserita
 * correttamente dall'operatore (status='completed', step finale del flow).
 *
 * Non aspettiamo l'attivazione operativa (operational_status='ACTIVATED'):
 * quella arriva dopo dal back office e può richiedere giorni. Il pezzo
 * gara è la VENDITA, non l'attivazione. Le pratiche annullate / KO
 * vengono comunque escluse.
 *
 * REGOLA:
 *   - status = 'completed'
 *   - operationalStatus NON deve essere REJECTED / KO_*
 */
function isPracticeCounting(practice: Practice): boolean {
  if (!practice) return false;
  if (practice.status !== 'completed') return false;
  const op = practice.operationalStatus;
  if (op === 'REJECTED' || op === 'KO_CREDITO' || op === 'KO_COPERTURA') return false;
  return true;
}

@Injectable()
export class CompetitionEntriesService {
  private readonly logger = new Logger(CompetitionEntriesService.name);

  constructor(
    @InjectRepository(Competition)
    private readonly competitionRepo: Repository<Competition>,
    @InjectRepository(CompetitionTarget)
    private readonly targetRepo: Repository<CompetitionTarget>,
    @InjectRepository(CompetitionEntry)
    private readonly entryRepo: Repository<CompetitionEntry>,
    @InjectRepository(Practice)
    private readonly practiceRepo: Repository<Practice>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Offer)
    private readonly offerRepo: Repository<Offer>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  // =====================================================================
  //  RECOMPUTE — retroattivo, scansione completa periodo
  // =====================================================================

  /**
   * Ricalcola da zero tutte le entries di UNA gara.
   *
   * Step:
   *  1. Carica gara + targets
   *  2. DELETE tutte le entries esistenti (`competition_id = id`)
   *  3. Determina lo scope (shop singolo o tutti gli shop della company)
   *  4. Per ogni target, costruisce la query practices in base a `targetType`
   *     ed inserisce 1 entry per ogni match (con sourceType='PRACTICE')
   *  5. Loggin riepilogo
   *
   * Idempotente: chiamare 2 volte produce lo stesso stato finale.
   */
  async recomputeCompetition(competitionId: string): Promise<{
    deleted: number;
    inserted: number;
    perTarget: Array<{ targetId: string | null; label: string; pieces: number }>;
  }> {
    const comp = await this.competitionRepo.findOne({
      where: { id: competitionId },
      relations: ['targets'],
    });
    if (!comp) throw new NotFoundException('Gara non trovata');

    // 1. Determina shop scope
    const shopIds = await this.resolveShopScope(comp);

    // 2. Cancella tutte le entries della gara
    const deleted = await this.entryRepo.delete({ competitionId: comp.id });
    const deletedCount = deleted.affected || 0;

    let inserted = 0;
    const perTarget: Array<{ targetId: string | null; label: string; pieces: number }> = [];

    // 3. Per ogni target, cerca pratiche matchanti e crea entries
    if (!comp.targets || comp.targets.length === 0) {
      // Gara senza target: crea 1 entry per ogni pratica completed nel periodo
      const practices = await this.findPracticesForTarget(comp, null, shopIds);
      const entries = practices.map((p) => this.makeEntry(p, comp, null));
      if (entries.length) await this.entryRepo.save(entries);
      inserted += entries.length;
      perTarget.push({ targetId: null, label: 'Senza target', pieces: entries.length });
    } else {
      for (const target of comp.targets) {
        const practices = await this.findPracticesForTarget(comp, target, shopIds);
        const entries = practices.map((p) => this.makeEntry(p, comp, target));
        if (entries.length) await this.entryRepo.save(entries);
        inserted += entries.length;
        perTarget.push({
          targetId: target.id,
          label: target.label,
          pieces: entries.length,
        });
      }
    }

    this.logger.log(
      `Recompute "${comp.title}" (${comp.id}): deleted ${deletedCount}, inserted ${inserted} ` +
        `(scope=${comp.scopeType}, shops=${shopIds.length})`,
    );

    return { deleted: deletedCount, inserted, perTarget };
  }

  /**
   * Determina la lista di shop che contribuiscono alla gara.
   * - scopeType='shop'    → solo `comp.tenantId`
   * - scopeType='company' → tutti i tenant con stesso `companyId`
   *
   * Phase H — Hardening: se scope=company ma companyId è NULL (gara creata
   * prima dell'introduzione delle company, o config errata del tenant),
   * facciamo fallback al solo `comp.tenantId` invece di restituire `[null]`
   * che faceva fallire `IN (:...shopIds)` con array contenente null.
   */
  private async resolveShopScope(comp: Competition): Promise<string[]> {
    if (comp.scopeType === 'company' && comp.companyId) {
      const tenants = await this.tenantRepo.find({
        where: { companyId: comp.companyId },
        select: ['id'],
      });
      const ids = tenants.map((t) => t.id).filter(Boolean);
      if (ids.length > 0) return ids;
    }
    if (comp.scopeType === 'company' && !comp.companyId) {
      // eslint-disable-next-line no-console
      console.warn(
        `[Competition ${comp.id}] scopeType=company ma companyId=null → fallback a tenantId solo`,
      );
    }
    return [comp.tenantId].filter(Boolean) as string[];
  }

  /**
   * Trova le pratiche che matchano un target specifico.
   * Filtri base sempre applicati:
   *  - tenantId IN scope shops
   *  - operational_status = 'ACTIVATED'
   *  - source_import_job_id IS NULL (escludi import)
   *  - sold_by_id IS NOT NULL
   *  - created_at BETWEEN startDate AND endDate
   *
   * Filtri target-specific:
   *  - 'category_generic' → category = target.category
   *  - 'provider_generic' → category match + provider match (offer.provider OR practice.type)
   *  - 'specific'         → offer_id IN target.offer_ids
   *  - null target        → tutte le pratiche del periodo (gara senza target)
   */
  private async findPracticesForTarget(
    comp: Competition,
    target: CompetitionTarget | null,
    shopIds: string[],
  ): Promise<Practice[]> {
    const qb = this.practiceRepo
      .createQueryBuilder('p')
      .leftJoinAndMapOne(
        'p.offer',
        Offer,
        'o',
        'o.id = p.offerId',
      )
      .where('p.tenantId IN (:...shopIds)', { shopIds })
      // ⚠️ La gara è sulle pratiche ESEGUITE (= inserite correttamente),
      // non aspettiamo l'attivazione operativa che arriva dopo dal back office.
      .andWhere('p.status = :st', { st: 'completed' })
      .andWhere(
        "p.operationalStatus IS NULL OR p.operationalStatus NOT IN ('REJECTED', 'KO_CREDITO', 'KO_COPERTURA')",
      )
      .andWhere('p.sourceImportJobId IS NULL')
      .andWhere('p.soldById IS NOT NULL')
      .andWhere('p.createdAt >= :s', { s: comp.startDate })
      .andWhere('p.createdAt <= :e', {
        e: this.endOfDay(comp.endDate),
      });

    if (target) {
      // Categoria di base (sempre se non CUSTOM)
      if (target.category && target.category !== 'CUSTOM') {
        qb.andWhere('p.category = :cat', { cat: target.category });
      }

      switch (target.targetType) {
        case 'category_generic':
          // Già filtrata sopra dalla categoria. Nessun altro filtro.
          break;

        case 'provider_generic':
          if (target.provider) {
            const prov = target.provider.toUpperCase();
            qb.andWhere(
              new Brackets((sub) => {
                sub
                  .where('UPPER(o.provider) = :prov', { prov })
                  .orWhere('UPPER(p.type) = :prov', { prov })
                  .orWhere('UPPER(p.offerType) = :prov', { prov });
              }),
            );
          } else {
            // provider mancante → target malformato: nessun match
            qb.andWhere('1=0');
          }
          break;

        case 'specific':
          if (Array.isArray(target.offerIds) && target.offerIds.length > 0) {
            qb.andWhere('p.offerId IN (:...ids)', { ids: target.offerIds });
          } else if (
            target.matchProviders?.length ||
            target.matchOfferKeywords?.length
          ) {
            // Backward compat Tappa 3: match per keyword/provider testuale
            this.applyLegacyKeywordMatch(qb, target);
          } else {
            qb.andWhere('1=0'); // target specific vuoto → nessun match
          }
          break;
      }

      // Filtro consumer/business
      if (
        Array.isArray(target.matchPracticeTypes) &&
        target.matchPracticeTypes.length > 0
      ) {
        const types = target.matchPracticeTypes.map((t) => t.toLowerCase());
        qb.andWhere(
          new Brackets((sub) => {
            // o.type può essere 'consumer'/'business'; se manca usiamo offerType
            sub
              .where('LOWER(o.type) IN (:...types)', { types })
              .orWhere('LOWER(p.offerType) IN (:...types)', { types });
          }),
        );
      }
    }

    return qb.getMany();
  }

  private applyLegacyKeywordMatch(qb: any, target: CompetitionTarget) {
    if (target.matchProviders?.length) {
      const provs = target.matchProviders.map((p) => p.toUpperCase());
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('UPPER(o.provider) IN (:...provs)', { provs })
            .orWhere('UPPER(p.type) IN (:...provs)', { provs })
            .orWhere('UPPER(p.offerType) IN (:...provs)', { provs });
        }),
      );
    }
    if (target.matchOfferKeywords?.length) {
      qb.andWhere(
        new Brackets((sub) => {
          target.matchOfferKeywords!.forEach((kw, i) => {
            sub.orWhere(`UPPER(p.offerName) LIKE :kw${i}`, {
              [`kw${i}`]: `%${kw.toUpperCase()}%`,
            });
          });
        }),
      );
    }
  }

  private makeEntry(
    practice: Practice,
    comp: Competition,
    target: CompetitionTarget | null,
  ): Partial<CompetitionEntry> & { shopId?: string | null } {
    const offer = (practice as any).offer as Offer | undefined;
    const provider =
      (offer?.provider || practice.offerType || practice.type || '').toString().toUpperCase() ||
      null;
    return {
      tenantId: practice.tenantId,
      companyId: comp.companyId ?? null,
      competitionId: comp.id,
      targetId: target?.id ?? null,
      userId: practice.soldById!,
      sourceType: 'PRACTICE',
      sourceId: practice.id,
      category: (practice.category as EntryCategory) || 'FIXED_LINE',
      provider,
      offerName: practice.offerName || null,
      pieces: 1,
      revenue: null,
      // Campo aggiunto in Tappa 3.1
      shopId: practice.tenantId,
    } as any;
  }

  private endOfDay(d: Date | string): string {
    // endDate è date (YYYY-MM-DD); per includere tutto il giorno usiamo 23:59:59
    const s = typeof d === 'string' ? d : d.toISOString().slice(0, 10);
    return `${s} 23:59:59`;
  }

  // =====================================================================
  //  SYNC LIVE — chiamato dagli hook practices.service.ts
  // =====================================================================

  /**
   * Sincronizza le entries di UNA pratica su tutte le gare attive che la
   * includono per scope/periodo. Idempotente.
   *
   * Tappa 3.1: ora rispetta:
   *  - scope company (cerca anche le gare con scopeType=company e companyId match)
   *  - esclusione import (sourceImportJobId NOT NULL → no-op, rimuove se esistono)
   *  - target_type ('category_generic'|'provider_generic'|'specific')
   */
  async syncPracticeEntries(practiceId: string): Promise<void> {
    const practice = await this.practiceRepo.findOne({
      where: { id: practiceId },
    });
    if (!practice) {
      await this.entryRepo.delete({ sourceType: 'PRACTICE', sourceId: practiceId });
      return;
    }

    const existingEntries = await this.entryRepo.find({
      where: { sourceType: 'PRACTICE', sourceId: practiceId },
    });

    // Pratica importata o non più valida → wipe entries
    if (
      practice.sourceImportJobId ||
      !isPracticeCounting(practice) ||
      !practice.soldById
    ) {
      if (existingEntries.length > 0) {
        await this.entryRepo.remove(existingEntries);
        this.logger.log(
          `Practice ${practiceId} skip/cleanup → removed ${existingEntries.length} entries`,
        );
      }
      return;
    }

    const tenant = await this.tenantRepo.findOne({ where: { id: practice.tenantId } });
    const companyId = tenant?.companyId ?? null;
    const offer = practice.offerId
      ? await this.offerRepo.findOne({ where: { id: practice.offerId } })
      : null;

    // Trova gare attive che includono questa pratica:
    //  - scope='shop' AND tenantId = practice.tenantId AND periodo include createdAt
    //  - scope='company' AND companyId = practice.companyId AND periodo include createdAt
    const today = new Date(practice.createdAt).toISOString().slice(0, 10);
    const qb = this.competitionRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.targets', 't')
      .where('c.isActive = true')
      .andWhere('c.startDate <= :d', { d: today })
      .andWhere('c.endDate >= :d', { d: today })
      .andWhere(
        new Brackets((sub) => {
          sub.where('(c.scopeType = :s AND c.tenantId = :tenantId)', {
            s: 'shop',
            tenantId: practice.tenantId,
          });
          if (companyId) {
            sub.orWhere('(c.scopeType = :sc AND c.companyId = :cid)', {
              sc: 'company',
              cid: companyId,
            });
          }
        }),
      );
    const activeCompetitions = await qb.getMany();

    // Determina target matchanti
    const desired: Array<{ competitionId: string; targetId: string | null }> = [];
    for (const comp of activeCompetitions) {
      const targets = comp.targets || [];
      if (targets.length === 0) {
        desired.push({ competitionId: comp.id, targetId: null });
        continue;
      }
      const matching = targets.filter((t) =>
        this.targetMatchesPractice(t, practice, offer),
      );
      for (const t of matching) {
        desired.push({ competitionId: comp.id, targetId: t.id });
      }
    }

    // Diff con esistenti
    const desiredKeys = new Set(
      desired.map((d) => `${d.competitionId}|${d.targetId ?? 'null'}|${practice.soldById}`),
    );
    const existingKeys = new Map(
      existingEntries.map((e) => [
        `${e.competitionId}|${e.targetId ?? 'null'}|${e.userId}`,
        e,
      ]),
    );

    const toRemove: CompetitionEntry[] = [];
    for (const [k, e] of existingKeys.entries()) {
      if (!desiredKeys.has(k)) toRemove.push(e);
    }

    const toInsert: any[] = [];
    for (const d of desired) {
      const k = `${d.competitionId}|${d.targetId ?? 'null'}|${practice.soldById}`;
      if (!existingKeys.has(k)) {
        toInsert.push({
          tenantId: practice.tenantId,
          companyId,
          competitionId: d.competitionId,
          targetId: d.targetId,
          userId: practice.soldById,
          sourceType: 'PRACTICE',
          sourceId: practice.id,
          category: (practice.category as EntryCategory) || 'FIXED_LINE',
          provider:
            (offer?.provider || practice.offerType || practice.type || '')
              .toString()
              .toUpperCase() || null,
          offerName: practice.offerName || null,
          pieces: 1,
          revenue: null,
          shopId: practice.tenantId,
        });
      }
    }

    if (toRemove.length || toInsert.length) {
      await this.dataSource.transaction(async (m) => {
        if (toRemove.length)
          await m.getRepository(CompetitionEntry).remove(toRemove);
        if (toInsert.length) await m.getRepository(CompetitionEntry).save(toInsert);
      });
      this.logger.log(
        `Practice ${practiceId} synced: +${toInsert.length} -${toRemove.length}`,
      );
    }
  }

  async removeForPractice(practiceId: string): Promise<void> {
    await this.entryRepo.delete({ sourceType: 'PRACTICE', sourceId: practiceId });
  }

  // =====================================================================
  //  Phase G.2 — Monitor mensile (totali + top 3 venditori per gara attiva)
  // =====================================================================

  async monthlyOverview(
    activeShopId: string,
    topN: number = 3,
    viewerCanSeeHidden: boolean = false,
  ): Promise<any> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthLabel = monthStart.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

    // 1) Pratiche ACTIVATED del mese sullo shop attivo (indipendente dalle gare)
    const activatedRaw = await this.practiceRepo
      .createQueryBuilder('p')
      .select('p.category', 'category')
      .addSelect('COUNT(*)', 'cnt')
      .where('p.tenantId = :tid', { tid: activeShopId })
      .andWhere('p.operationalStatus = :st', { st: 'ACTIVATED' })
      .andWhere('p.createdAt >= :ms', { ms: monthStart })
      .andWhere('p.createdAt <= :me', { me: monthEnd })
      .groupBy('p.category')
      .getRawMany();

    const byCategory: Record<string, number> = {};
    let practicesActivatedThisMonth = 0;
    for (const r of activatedRaw) {
      const c = r.category || 'UNKNOWN';
      const n = parseInt(r.cnt, 10) || 0;
      byCategory[c] = n;
      practicesActivatedThisMonth += n;
    }

    // 2) Gare in corso che includono lo shop attivo
    const allComps = await this.competitionRepo.find({
      where: { isActive: true },
      relations: ['targets'],
      order: { startDate: 'DESC' },
    });

    // Phase H — Diagnostica: log esplicito per capire cosa filtriamo via.
    // Visibile nei log Railway, utile quando il widget appare vuoto.
    let filteredOutByPeriod = 0;
    let filteredOutByScope = 0;

    const activeCompetitions: any[] = [];
    for (const comp of allComps) {
      // Filtra le gare nascoste agli utenti che non hanno il permesso di vederle
      if (comp.isHidden === true && !viewerCanSeeHidden) continue;
      const start = new Date(comp.startDate);
      const end = new Date(this.endOfDay(comp.endDate));
      if (now < start || now > end) {
        filteredOutByPeriod++;
        continue;
      }

      // verifica scope
      const scopeIds = await this.resolveShopScope(comp);
      if (!scopeIds.includes(activeShopId)) {
        filteredOutByScope++;
        // eslint-disable-next-line no-console
        console.log(
          `[monthlyOverview] gara "${comp.title}" esclusa: scope=${comp.scopeType} ` +
            `shopIds=[${scopeIds.join(',')}] ma activeShopId=${activeShopId}`,
        );
        continue;
      }

      // non mostrare gare nascoste agli operator (ma il founder le vede)
      // qui ritorniamo sempre, è il frontend a filtrare se serve

      const totalTargetPieces = (comp.targets || []).reduce(
        (s, t) => s + (Number(t.targetPieces) || 0),
        0,
      );

      const top3Raw = await this.entryRepo
        .createQueryBuilder('e')
        .select('e.userId', 'userId')
        .addSelect('SUM(e.pieces)', 'pieces')
        .where('e.competitionId = :cid', { cid: comp.id })
        .groupBy('e.userId')
        .orderBy('pieces', 'DESC')
        .limit(topN)
        .getRawMany();

      // Risolvi nomi venditore con repo (no raw join: più affidabile,
      // non dipende da maiuscole/minuscole tabella e funziona anche per
      // utenti di altri shop in scope COMPANY)
      const userIds = top3Raw.map((r) => r.userId).filter(Boolean);
      const users = userIds.length
        ? await this.userRepo.find({
            where: { id: In(userIds) },
            select: ['id', 'firstName', 'lastName', 'email'],
          })
        : [];
      const userMap = new Map(users.map((u) => [u.id, u]));

      // Totale pratiche "completed" del periodo (in scope) per ciascun top user
      // → serve per calcolare i "pezzi fuori gara" (totale - in-gara).
      const totalsRaw = userIds.length
        ? await this.practiceRepo
            .createQueryBuilder('p')
            .select('p.soldById', 'userId')
            .addSelect('COUNT(*)', 'pieces')
            .where('p.tenantId IN (:...shopIds)', { shopIds: scopeIds })
            .andWhere('p.status = :st', { st: 'completed' })
            .andWhere(
              "p.operationalStatus IS NULL OR p.operationalStatus NOT IN ('REJECTED', 'KO_CREDITO', 'KO_COPERTURA')",
            )
            .andWhere('p.sourceImportJobId IS NULL')
            .andWhere('p.soldById IN (:...uids)', { uids: userIds })
            .andWhere('p.createdAt >= :s', { s: comp.startDate })
            .andWhere('p.createdAt <= :e', { e: this.endOfDay(comp.endDate) })
            .groupBy('p.soldById')
            .getRawMany()
        : [];
      const totalsByUser = new Map<string, number>(
        totalsRaw.map((r) => [r.userId, parseInt(r.pieces, 10) || 0]),
      );

      const totalEntries = await this.entryRepo
        .createQueryBuilder('e')
        .select('COALESCE(SUM(e.pieces), 0)', 'total')
        .where('e.competitionId = :cid', { cid: comp.id })
        .getRawOne();

      activeCompetitions.push({
        id: comp.id,
        title: comp.title,
        startDate: comp.startDate,
        endDate: comp.endDate,
        scopeType: comp.scopeType,
        isHidden: comp.isHidden === true,
        totalTargetPieces,
        totalEntriesPieces: parseInt(totalEntries?.total ?? '0', 10),
        progressPercent: totalTargetPieces
          ? Math.min(
              100,
              Math.round((parseInt(totalEntries?.total ?? '0', 10) / totalTargetPieces) * 100),
            )
          : 0,
        top3: top3Raw.map((r) => {
          const u = userMap.get(r.userId);
          const name = u
            ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email
            : 'Utente eliminato';
          const inGara = parseInt(r.pieces, 10) || 0;
          const totalUserPieces = totalsByUser.get(r.userId) ?? inGara;
          const outOfGara = Math.max(0, totalUserPieces - inGara);
          return {
            userId: r.userId,
            name: name || 'Sconosciuto',
            // Backward compat: il vecchio frontend leggeva `pieces`
            pieces: inGara,
            inCompetitionPieces: inGara,
            outOfCompetitionPieces: outOfGara,
          };
        }),
      });
    }

    // Phase H — log riepilogo diagnostica
    if (allComps.length > 0 && activeCompetitions.length === 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `[monthlyOverview] activeShopId=${activeShopId}: ` +
          `${allComps.length} gare attive nel DB, ${filteredOutByPeriod} fuori periodo, ` +
          `${filteredOutByScope} fuori scope, 0 mostrate al widget.`,
      );
    }

    return {
      monthLabel,
      monthStart,
      monthEnd,
      practicesActivatedThisMonth,
      byCategory,
      activeCompetitions,
    };
  }

  // =====================================================================

  /**
   * Ritorna un dump completo dello stato di una gara per debugging:
   *  - dettagli gara + targets + scope
   *  - shopIds inclusi
   *  - per ogni target: numero pratiche candidate, primi 5 esempi (con motivo
   *    di match/mismatch), conteggio entries esistenti
   *  - lista pratiche "vicine" che NON entrano e relativa motivazione
   *
   * Utile quando l'utente dice "la mia gara non avanza, perché?".
   */
  async diagnoseCompetition(competitionId: string): Promise<any> {
    const comp = await this.competitionRepo.findOne({
      where: { id: competitionId },
      relations: ['targets'],
    });
    if (!comp) throw new NotFoundException('Gara non trovata');

    const shopIds = await this.resolveShopScope(comp);
    const existingEntries = await this.entryRepo.find({ where: { competitionId } });

    // Tutte le pratiche del periodo nello scope (senza filtri di match)
    const allPracticesInPeriod = await this.practiceRepo
      .createQueryBuilder('p')
      .leftJoinAndMapOne('p.offer', Offer, 'o', 'o.id = p.offerId')
      .where('p.tenantId IN (:...shopIds)', { shopIds })
      .andWhere('p.createdAt >= :s', { s: comp.startDate })
      .andWhere('p.createdAt <= :e', { e: this.endOfDay(comp.endDate) })
      .orderBy('p.createdAt', 'DESC')
      .getMany();

    // Per ogni pratica capisci perché entra/non entra
    const practicesAnalysis = allPracticesInPeriod.map((p) => {
      const reasons: string[] = [];
      let baseEligible = true;
      if (p.operationalStatus !== 'ACTIVATED') {
        baseEligible = false;
        reasons.push(`status=${p.operationalStatus} (richiesto: ACTIVATED)`);
      }
      if (p.sourceImportJobId) {
        baseEligible = false;
        reasons.push(`importata (sourceImportJobId valorizzato)`);
      }
      if (!p.soldById) {
        baseEligible = false;
        reasons.push(`soldById=null (manca venditore)`);
      }

      let matchedTargets: string[] = [];
      if (baseEligible && comp.targets?.length) {
        for (const t of comp.targets) {
          if (this.targetMatchesPractice(t, p, (p as any).offer || null)) {
            matchedTargets.push(t.label);
          }
        }
        if (matchedTargets.length === 0) {
          reasons.push(`nessun target matcha (category=${p.category}, provider=${(p as any).offer?.provider || p.type || 'n/a'}, offerId=${p.offerId || 'null'})`);
        }
      }

      return {
        practiceId: p.id,
        createdAt: p.createdAt,
        category: p.category,
        offerName: p.offerName,
        offerId: p.offerId,
        offerProvider: (p as any).offer?.provider || null,
        type: p.type,
        operationalStatus: p.operationalStatus,
        soldById: p.soldById,
        sourceImportJobId: p.sourceImportJobId,
        eligibleBase: baseEligible,
        matchedTargets,
        excluded: !baseEligible || matchedTargets.length === 0,
        reasons,
      };
    });

    // Sommari per target
    const perTarget = (comp.targets || []).map((t) => {
      const entriesForTarget = existingEntries.filter((e) => e.targetId === t.id);
      const matchingPractices = practicesAnalysis.filter((pa) =>
        pa.matchedTargets.includes(t.label),
      );
      return {
        targetId: t.id,
        label: t.label,
        targetType: t.targetType,
        category: t.category,
        provider: t.provider,
        offerIds: t.offerIds,
        targetPieces: t.targetPieces,
        existingEntries: entriesForTarget.length,
        candidatePractices: matchingPractices.length,
        candidateExamples: matchingPractices.slice(0, 5).map((p) => ({
          id: p.practiceId,
          offer: p.offerName,
          createdAt: p.createdAt,
        })),
      };
    });

    return {
      competition: {
        id: comp.id,
        title: comp.title,
        startDate: comp.startDate,
        endDate: comp.endDate,
        scopeType: comp.scopeType,
        isActive: comp.isActive,
        isHidden: comp.isHidden,
        companyId: comp.companyId,
        tenantId: comp.tenantId,
      },
      scopeShopIds: shopIds,
      totalPracticesInPeriod: allPracticesInPeriod.length,
      eligiblePractices: practicesAnalysis.filter((p) => p.eligibleBase).length,
      excludedPractices: practicesAnalysis.filter((p) => p.excluded).length,
      totalEntriesExisting: existingEntries.length,
      perTarget,
      practicesAnalysis,
    };
  }

  // =====================================================================
  //  Match logic in-memory (per syncPracticeEntries)
  // =====================================================================

  private targetMatchesPractice(
    target: CompetitionTarget,
    practice: Practice,
    offer: Offer | null,
  ): boolean {
    // Categoria
    if (
      target.category &&
      target.category !== 'CUSTOM' &&
      target.category !== practice.category
    ) {
      return false;
    }

    const providerUpper = (
      offer?.provider ||
      practice.offerType ||
      practice.type ||
      ''
    )
      .toString()
      .toUpperCase();

    switch (target.targetType) {
      case 'category_generic':
        // basta la categoria
        break;
      case 'provider_generic':
        if (!target.provider) return false;
        if (providerUpper !== target.provider.toUpperCase()) return false;
        break;
      case 'specific':
        if (Array.isArray(target.offerIds) && target.offerIds.length > 0) {
          if (!practice.offerId || !target.offerIds.includes(practice.offerId)) {
            return false;
          }
        } else {
          // Fallback Tappa 3: match per keyword/provider testuale
          if (target.matchProviders?.length) {
            const wantUpper = target.matchProviders.map((s) => s.toUpperCase());
            if (!wantUpper.includes(providerUpper)) return false;
          }
          if (target.matchOfferKeywords?.length) {
            const offerUpper = (practice.offerName || '').toUpperCase();
            const ok = target.matchOfferKeywords.some((kw) =>
              offerUpper.includes(kw.toUpperCase()),
            );
            if (!ok) return false;
          }
          if (
            !target.matchProviders?.length &&
            !target.matchOfferKeywords?.length
          ) {
            return false; // target specific vuoto
          }
        }
        break;
    }

    if (
      Array.isArray(target.matchPracticeTypes) &&
      target.matchPracticeTypes.length > 0
    ) {
      const offerType = (
        offer?.type ||
        practice.offerType ||
        ''
      )
        .toString()
        .toLowerCase();
      const want = target.matchPracticeTypes.map((t) => t.toLowerCase());
      if (!want.some((w) => offerType.includes(w))) return false;
    }

    return true;
  }
}
