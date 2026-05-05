import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not, IsNull } from 'typeorm';
import { NotificationType } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';
import { emitNotification } from './notifications.controller';
import { Practice } from '../practices/entities/practice.entity';
import { Competition } from '../competitions/entities/competition.entity';
import { CompetitionEntry } from '../competitions/entities/competition-entry.entity';

/**
 * Cron job giornaliero per notifiche automatiche:
 *  1. Pratiche stale (completate da 8+ giorni, operationalStatus ≠ ACTIVATED)
 *  2. Reminder gare attive con pochi pezzi mancanti
 *
 * Parte alle 09:00 del mattino (timezone server).
 */
@Injectable()
export class NotificationsCronService {
  private readonly logger = new Logger(NotificationsCronService.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    @InjectRepository(Practice)
    private readonly practiceRepo: Repository<Practice>,
    @InjectRepository(Competition)
    private readonly competitionRepo: Repository<Competition>,
    @InjectRepository(CompetitionEntry)
    private readonly entryRepo: Repository<CompetitionEntry>,
  ) {}

  @Cron('0 9 * * *', { name: 'dailyNotifications' })
  async runDaily() {
    this.logger.log('[Cron] dailyNotifications started');
    try {
      await this.notifyStalePractices();
      await this.notifyCompetitionReminders();
    } catch (err) {
      this.logger.error('[Cron] dailyNotifications failed', err);
    }
    this.logger.log('[Cron] dailyNotifications finished');
  }

  /** Pratiche completate da 8+ giorni ma ancora non attivate. */
  private async notifyStalePractices() {
    const eightDaysAgo = new Date();
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
    eightDaysAgo.setHours(0, 0, 0, 0);

    const practices = await this.practiceRepo.find({
      where: {
        status: 'completed',
        operationalStatus: Not('ACTIVATED'),
        soldById: Not(IsNull()),
        createdAt: LessThan(eightDaysAgo),
      },
      select: ['id', 'tenantId', 'soldById', 'offerName', 'category', 'createdAt'],
    });

    for (const p of practices) {
      try {
        const notif = await this.notificationsService.create({
          tenantId: p.tenantId,
          userId: p.soldById!,
          type: NotificationType.PRACTICE_STALE,
          title: 'Pratica in attesa',
          message: `La pratica "${p.offerName || '—'}" è ancora in lavorazione dopo 8 giorni. Perché non chiami il cliente e vedi come va? Si sentirà curato.`,
          linkUrl: `/operator/practices/${p.id}`,
          linkLabel: 'Vedi pratica',
        });
        emitNotification(p.soldById!, notif);
      } catch {
        /* ignore single failure */
      }
    }

    if (practices.length > 0) {
      this.logger.log(`[Cron] stale practices: sent ${practices.length} notifications`);
    }
  }

  /** Gare attive con meno del 20% del target rimanente → reminder. */
  private async notifyCompetitionReminders() {
    const today = new Date().toISOString().slice(0, 10);
    const competitions = await this.competitionRepo.find({
      where: { isActive: true },
    });

    for (const comp of competitions) {
      const target = comp.target ?? 0;
      if (target <= 0) continue;

      const piecesDone = await this.entryRepo.count({
        where: { competitionId: comp.id },
      });
      const remaining = target - piecesDone;
      const pctRemaining = remaining / target;

      // Notifica solo se mancano meno del 20% e la gara non è ancora completata
      if (pctRemaining > 0.2 || remaining <= 0) continue;

      // Trova gli operatori partecipanti (soldById unici dalle entries)
      const entries = await this.entryRepo
        .createQueryBuilder('e')
        .select('DISTINCT e.soldById', 'soldById')
        .where('e.competitionId = :cid', { cid: comp.id })
        .getRawMany<{ soldById: string }>();

      const userIds = entries.map((e) => e.soldById).filter(Boolean);
      if (userIds.length === 0) continue;

      for (const uid of userIds) {
        try {
          const notif = await this.notificationsService.create({
            tenantId: comp.tenantId,
            userId: uid,
            type: NotificationType.COMPETITION_REMINDER,
            title: 'Gara in chiusura!',
            message: `Dai, stiamo chiudendo la gara "${comp.title}" di ${this.monthYearLabel(comp.startDate)}: mancano ${remaining} pezzi per completarla!`,
            linkUrl: `/operator/competitions/${comp.id}`,
            linkLabel: 'Vedi gara',
          });
          emitNotification(uid, notif);
        } catch {
          /* ignore */
        }
      }

      this.logger.log(
        `[Cron] competition reminder "${comp.title}": sent ${userIds.length} notifications`,
      );
    }
  }

  private monthYearLabel(dateStr: string): string {
    const d = new Date(dateStr);
    const months = [
      'gennaio','febbraio','marzo','aprile','maggio','giugno',
      'luglio','agosto','settembre','ottobre','novembre','dicembre',
    ];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  }
}
