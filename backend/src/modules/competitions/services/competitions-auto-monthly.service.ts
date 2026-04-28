import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Competition } from '../entities/competition.entity';
import { CompetitionTarget } from '../entities/competition-target.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

/**
 * Generatore automatico delle "gare mensili" 1°-30(31)° del mese.
 *
 * Logica:
 *  - Cron il 1° del mese alle 00:05 → per ogni shop attivo crea una gara con
 *    `isAutoMonthly=true` e `templateKey="AUTO-YYYY-MM"`.
 *  - I target di base sono opzionali: lasciamo che il founder li personalizzi.
 *    Aggiungiamo un set MINIMO con totali per categoria (FIXED_LINE / MOBILE / ENERGY)
 *    senza target pieces (0 = nessuna soglia, solo conteggio).
 *
 * Idempotente: se la gara mensile per quel mese esiste già → skip.
 */
@Injectable()
export class CompetitionsAutoMonthlyService {
  private readonly logger = new Logger(CompetitionsAutoMonthlyService.name);

  constructor(
    @InjectRepository(Competition)
    private readonly compRepo: Repository<Competition>,
    @InjectRepository(CompetitionTarget)
    private readonly targetRepo: Repository<CompetitionTarget>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  // Il 1° del mese alle 00:05
  @Cron('5 0 1 * *', { name: 'competitionsAutoMonthly' })
  async runMonthlyJob() {
    await this.ensureMonthCompetitions(new Date());
  }

  /**
   * Crea (se mancanti) le gare mensili per il mese di `referenceDate`.
   * Esposto pubblicamente per poterlo invocare manualmente da endpoint admin.
   */
  async ensureMonthCompetitions(referenceDate: Date): Promise<{ created: number; skipped: number }> {
    const yyyy = referenceDate.getUTCFullYear();
    const mm = String(referenceDate.getUTCMonth() + 1).padStart(2, '0');
    const templateKey = `AUTO-${yyyy}-${mm}`;
    const startDate = new Date(Date.UTC(yyyy, referenceDate.getUTCMonth(), 1));
    const endDate = new Date(Date.UTC(yyyy, referenceDate.getUTCMonth() + 1, 0)); // ultimo giorno del mese

    const tenants = await this.tenantRepo.find();
    let created = 0;
    let skipped = 0;

    for (const t of tenants) {
      const exists = await this.compRepo.findOne({
        where: { tenantId: t.id, templateKey },
      });
      if (exists) {
        skipped++;
        continue;
      }
      const monthLabel = referenceDate.toLocaleDateString('it-IT', {
        month: 'long',
        year: 'numeric',
      });
      const comp = this.compRepo.create({
        tenantId: t.id,
        companyId: t.companyId,
        title: `Gara mensile · ${monthLabel.charAt(0).toUpperCase()}${monthLabel.slice(1)}`,
        description: 'Gara generata automaticamente. Personalizza target e premi nel pannello gare.',
        startDate: startDate as any,
        endDate: endDate as any,
        isActive: true,
        isAutoMonthly: true,
        templateKey,
      });
      const saved = await this.compRepo.save(comp);

      // Set di target di default (totali per categoria, senza soglia)
      const defaultTargets: Partial<CompetitionTarget>[] = [
        {
          competitionId: saved.id,
          label: 'Tutte le pratiche rete fissa',
          category: 'FIXED_LINE',
          matchProviders: [],
          matchOfferKeywords: [],
          matchPracticeTypes: [],
          targetPieces: 0,
          sortOrder: 0,
        },
        {
          competitionId: saved.id,
          label: 'Tutte le pratiche mobile',
          category: 'MOBILE',
          matchProviders: [],
          matchOfferKeywords: [],
          matchPracticeTypes: [],
          targetPieces: 0,
          sortOrder: 1,
        },
        {
          competitionId: saved.id,
          label: 'MNP (mobile)',
          category: 'MOBILE',
          matchProviders: [],
          matchOfferKeywords: ['MNP'],
          matchPracticeTypes: [],
          targetPieces: 0,
          sortOrder: 2,
        },
        {
          competitionId: saved.id,
          label: 'Tutte le pratiche luce e gas',
          category: 'ENERGY',
          matchProviders: [],
          matchOfferKeywords: [],
          matchPracticeTypes: [],
          targetPieces: 0,
          sortOrder: 3,
        },
      ];
      await this.targetRepo.save(defaultTargets);
      created++;
    }

    this.logger.log(
      `Auto-monthly competitions for ${templateKey}: created=${created}, skipped=${skipped}`,
    );
    return { created, skipped };
  }
}
