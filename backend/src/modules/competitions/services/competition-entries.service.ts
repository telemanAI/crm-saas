import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Competition } from '../entities/competition.entity';
import { CompetitionTarget, TargetCategory } from '../entities/competition-target.entity';
import { CompetitionEntry, EntrySourceType, EntryCategory } from '../entities/competition-entry.entity';
import { Practice } from '../../practices/entities/practice.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

/**
 * Decide se una pratica è "completata" e dovrebbe assegnare pezzi.
 *
 * Regola concordata con l'utente: il pezzo si assegna quando l'operator clicca
 * "completa pratica", cioè quando lo `status` passa a 'completed'. Questo include:
 *  - submit del wizard (updateStep con dto.data.completed=true)
 *  - forceComplete
 *  - updateOperationalStatus → ACTIVATED
 *
 * Se la pratica torna a draft/cancellata: rimuoviamo le entries.
 */
function isPracticeCounting(practice: Practice): boolean {
  if (!practice) return false;
  if (practice.status === 'cancelled' || practice.status === 'draft') return false;
  if (practice.operationalStatus === 'REJECTED') return false;
  // status: 'in_progress' | 'completed' → conta
  // operationalStatus: PENDING | IN_PROGRESS | ACTIVATED | (REJECTED già escluso) → tutti contano
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
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Sincronizza le entries di una pratica con tutte le gare attive.
   *
   * Logica:
   * 1. Carica la pratica + sue entries esistenti
   * 2. Se la pratica non conta più (cancellata/eliminata/respinta) → DELETE tutto e basta
   * 3. Trova tutte le gare attive nello shop nel periodo, con i loro target
   * 4. Per ogni target che matcha la pratica → assicura esistenza entry per soldById
   * 5. Rimuove entries che non matchano più (es. cambiato provider, cambiato user)
   *
   * Idempotente: chiamabile più volte senza duplicare. Dovrebbe essere chiamato
   * dal PracticesService dopo ogni save (status change, operational change, soldBy change).
   */
  async syncPracticeEntries(practiceId: string): Promise<void> {
    const practice = await this.practiceRepo.findOne({ where: { id: practiceId } });
    if (!practice) {
      // pratica eliminata → cleanup
      await this.entryRepo.delete({ sourceType: 'PRACTICE', sourceId: practiceId });
      return;
    }

    const existingEntries = await this.entryRepo.find({
      where: { sourceType: 'PRACTICE', sourceId: practiceId },
    });

    if (!isPracticeCounting(practice)) {
      // Non conta più → rimuovi tutte le entries esistenti
      if (existingEntries.length > 0) {
        await this.entryRepo.remove(existingEntries);
        this.logger.log(`Practice ${practiceId} no longer counts → removed ${existingEntries.length} entries`);
      }
      return;
    }

    // soldById obbligatorio per assegnare il pezzo. Se manca, aspettiamo
    // che venga settato nel wizard step 2.
    const userId = practice.soldById;
    if (!userId) {
      if (existingEntries.length > 0) {
        await this.entryRepo.remove(existingEntries);
      }
      return;
    }

    const tenantId = practice.tenantId;
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const companyId = tenant?.companyId ?? null;
    const category = (practice.category as EntryCategory) || 'FIXED_LINE';
    const provider = (practice.offerType || '').toString().toUpperCase() || null;
    const offerName = practice.offerName || null;
    const practiceType = practice.offerType?.toLowerCase().includes('business')
      ? 'business'
      : 'consumer';

    // Trova gare attive nello shop nel periodo della pratica
    const today = new Date().toISOString().slice(0, 10);
    const activeCompetitions = await this.competitionRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.targets', 't')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.isActive = true')
      .andWhere('c.startDate <= :today', { today })
      .andWhere('c.endDate >= :today', { today })
      .getMany();

    // Calcola i target matchanti per ogni gara
    const desired: Array<{
      competitionId: string;
      targetId: string | null;
    }> = [];

    for (const comp of activeCompetitions) {
      const matchingTargets = (comp.targets || []).filter((t) =>
        this.targetMatchesPractice(t, { category, provider, offerName, practiceType }),
      );
      if (matchingTargets.length > 0) {
        for (const t of matchingTargets) {
          desired.push({ competitionId: comp.id, targetId: t.id });
        }
      } else {
        // Nessun target specifico ma la pratica conta → entry "senza target" (nullable)
        // SOLO se la gara non ha targets o nessun target è di questa category
        const compHasCategoryTargets = (comp.targets || []).some(
          (t) => t.category === category || t.category === 'CUSTOM',
        );
        if (!compHasCategoryTargets) {
          desired.push({ competitionId: comp.id, targetId: null });
        }
      }
    }

    // Diff con esistenti (chiave: competition_id|target_id|user_id)
    const desiredKeys = new Set(
      desired.map((d) => `${d.competitionId}|${d.targetId ?? 'null'}|${userId}`),
    );
    const existingKeys = new Map(
      existingEntries.map((e) => [
        `${e.competitionId}|${e.targetId ?? 'null'}|${e.userId}`,
        e,
      ]),
    );

    // Da rimuovere: esistenti non più desiderate (es. cambio provider, cambio venditore)
    const toRemove: CompetitionEntry[] = [];
    for (const [k, e] of existingKeys.entries()) {
      if (!desiredKeys.has(k)) toRemove.push(e);
    }
    // Da inserire: desiderate non esistenti
    const toInsert: Partial<CompetitionEntry>[] = [];
    for (const d of desired) {
      const k = `${d.competitionId}|${d.targetId ?? 'null'}|${userId}`;
      if (!existingKeys.has(k)) {
        toInsert.push({
          tenantId,
          companyId,
          competitionId: d.competitionId,
          targetId: d.targetId,
          userId,
          sourceType: 'PRACTICE',
          sourceId: practiceId,
          category,
          provider,
          offerName,
          pieces: 1,
          revenue: null,
        });
      }
    }

    await this.dataSource.transaction(async (manager) => {
      if (toRemove.length > 0) {
        await manager.getRepository(CompetitionEntry).remove(toRemove);
      }
      if (toInsert.length > 0) {
        await manager.getRepository(CompetitionEntry).save(toInsert);
      }
    });

    if (toRemove.length || toInsert.length) {
      this.logger.log(
        `Practice ${practiceId} synced: +${toInsert.length} -${toRemove.length} entries (provider=${provider} cat=${category})`,
      );
    }
  }

  /** Eliminazione esplicita (chiamato prima di delete della pratica). */
  async removeForPractice(practiceId: string): Promise<void> {
    await this.entryRepo.delete({ sourceType: 'PRACTICE', sourceId: practiceId });
  }

  /** Eliminazione entries di una vendita dispositivo. */
  async removeForDeviceSale(movementId: string): Promise<void> {
    await this.entryRepo.delete({ sourceType: 'DEVICE_SALE', sourceId: movementId });
  }

  // ========= Match logic =========

  private targetMatchesPractice(
    target: CompetitionTarget,
    p: {
      category: EntryCategory;
      provider: string | null;
      offerName: string | null;
      practiceType: string;
    },
  ): boolean {
    // CATEGORY
    if (target.category !== 'CUSTOM' && target.category !== p.category) return false;

    // PROVIDER (uppercase)
    if (target.matchProviders && target.matchProviders.length > 0) {
      const wantUpper = target.matchProviders.map((s) => s.toUpperCase());
      if (!p.provider || !wantUpper.includes(p.provider)) return false;
    }

    // OFFER KEYWORDS (uppercase, almeno uno deve matchare)
    if (target.matchOfferKeywords && target.matchOfferKeywords.length > 0) {
      const offerUpper = (p.offerName || '').toUpperCase();
      const matchAny = target.matchOfferKeywords.some((kw) =>
        offerUpper.includes(kw.toUpperCase()),
      );
      if (!matchAny) return false;
    }

    // PRACTICE TYPES
    if (target.matchPracticeTypes && target.matchPracticeTypes.length > 0) {
      if (!target.matchPracticeTypes.includes(p.practiceType)) return false;
    }

    return true;
  }
}
