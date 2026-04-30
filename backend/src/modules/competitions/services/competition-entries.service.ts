import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Brackets } from 'typeorm';
import { Competition } from '../entities/competition.entity';
import { CompetitionTarget, TargetType, TargetCategory } from '../entities/competition-target.entity';
import { CompetitionEntry, EntrySourceType, EntryCategory } from '../entities/competition-entry.entity';
import { Practice } from '../../practices/entities/practice.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Offer } from '../../offers/entities/offer.entity';

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

function isPracticeCounting(practice: Practice): boolean {
  if (!practice) return false;
  if (practice.status === 'cancelled' || practice.status === 'draft') return false;
  if (practice.operationalStatus === 'REJECTED') return false;
  return practice.status === 'completed' || practice.status === 'in_progress';
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
   */
  private async resolveShopScope(comp: Competition): Promise<string[]> {
    if (comp.scopeType === 'company' && comp.companyId) {
      const tenants = await this.tenantRepo.find({
        where: { companyId: comp.companyId },
        select: ['id'],
      });
      return tenants.map((t) => t.id);
    }
    return [comp.tenantId];
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
      .andWhere('p.operationalStatus = :st', { st: 'ACTIVATED' })
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
