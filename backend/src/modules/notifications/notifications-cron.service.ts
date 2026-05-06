import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not, IsNull, Brackets } from 'typeorm';
import { NotificationType } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';
import { emitNotification } from './notifications.controller';
import { Practice } from '../practices/entities/practice.entity';
import { Competition } from '../competitions/entities/competition.entity';
import { CompetitionEntry } from '../competitions/entities/competition-entry.entity';
import { CompetitionTarget } from '../competitions/entities/competition-target.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { UserShopMembership } from '../memberships/entities/user-shop-membership.entity';
import { User } from '../users/entities/user.entity';

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
    @InjectRepository(CompetitionTarget)
    private readonly targetRepo: Repository<CompetitionTarget>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(UserShopMembership)
    private readonly membershipRepo: Repository<UserShopMembership>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  @Cron('0 9 * * *', { name: 'dailyNotifications' })
  async runDaily() {
    this.logger.log('[Cron] dailyNotifications started');
    try {
      await this.notifyStalePractices();
      await this.notifyCompetitionReminders();
      await this.notifyDailyTargetPriority();
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
      const targetPieces = (comp.targets || []).reduce(
        (s, t) => s + (Number(t.targetPieces) || 0),
        0,
      );
      if (targetPieces <= 0) continue;

      const piecesDone = await this.entryRepo.count({
        where: { competitionId: comp.id },
      });
      const remaining = targetPieces - piecesDone;
      const pctRemaining = remaining / targetPieces;

      // Notifica solo se mancano meno del 20% e la gara non è ancora completata
      if (pctRemaining > 0.2 || remaining <= 0) continue;

      // Trova gli operatori partecipanti (userId unici dalle entries — è il
       // venditore agganciato dalla pratica/vendita)
      const entries = await this.entryRepo
        .createQueryBuilder('e')
        .select('DISTINCT e.userId', 'userId')
        .where('e.competitionId = :cid', { cid: comp.id })
        .getRawMany<{ userId: string }>();

      const userIds = entries.map((e) => e.userId).filter(Boolean);
      if (userIds.length === 0) continue;

      for (const uid of userIds) {
        try {
          const notif = await this.notificationsService.create({
            tenantId: comp.tenantId,
            userId: uid,
            type: NotificationType.COMPETITION_REMINDER,
            title: 'Gara in chiusura!',
            message: `Dai, stiamo chiudendo la gara "${comp.title}" di ${this.monthYearLabel(String(comp.startDate))}: mancano ${remaining} pezzi per completarla!`,
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

  // ============================================================
  //  DAILY TARGET PRIORITY
  // ============================================================

  /**
   * Per ogni venditore attivo, calcola i target gara con il gap maggiore
   * e invia UNA singola notifica con i top 3 in ordine di urgenza.
   *
   * Esempio output:
   *   "🎯 Focus di oggi
   *    Buongiorno Marco! Ecco le priorità:
   *    1. 📱 SKY MOBILE: 1/6 (16%) — concentrati qui!
   *    2. 🏠 Rete Fissa: 8/12 (66%)
   *    3. ⚡ Energia: 9/10 (90%)
   *    Buona giornata!"
   *
   * Anti-spam: se un utente non ha gap rilevanti (tutto >= 90%) o non
   * partecipa a nessuna gara, NON viene generata alcuna notifica.
   */
  private async notifyDailyTargetPriority() {
    // 1. Trova tutti i venditori attivi con membership attiva
    const memberships = await this.membershipRepo.find({
      where: { isActive: true },
      relations: ['user'],
    });

    // Raggruppa per userId per evitare di notificare 2 volte (multi-shop)
    const byUser = new Map<string, { user: User; shopIds: string[] }>();
    for (const m of memberships) {
      if (!m.userId || !m.user) continue;
      const existing = byUser.get(m.userId);
      if (existing) {
        existing.shopIds.push(m.shopId);
      } else {
        byUser.set(m.userId, { user: m.user, shopIds: [m.shopId] });
      }
    }

    if (byUser.size === 0) {
      this.logger.log('[Cron] notifyDailyTargetPriority: nessun utente attivo');
      return;
    }

    // 2. Carica tutte le gare attive con i loro target
    const today = new Date().toISOString().slice(0, 10);
    const activeCompetitions = await this.competitionRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.targets', 't')
      .where('c.isActive = true')
      .andWhere('c.startDate <= :d', { d: today })
      .andWhere('c.endDate >= :d', { d: today })
      .getMany();

    if (activeCompetitions.length === 0) {
      this.logger.log('[Cron] notifyDailyTargetPriority: nessuna gara attiva oggi');
      return;
    }

    // 3. Per ogni utente costruisce la lista di target e calcola priorità
    let sent = 0;
    for (const [userId, { user, shopIds }] of byUser.entries()) {
      const userShopIds = new Set(shopIds);

      // Trova le gare che includono almeno uno degli shop dell'utente
      const userCompetitions: Array<{
        comp: Competition;
        scopeShops: string[];
      }> = [];
      for (const comp of activeCompetitions) {
        let scope: string[] = [];
        if (comp.scopeType === 'shop') {
          scope = [comp.tenantId];
        } else if (comp.scopeType === 'company') {
          if (Array.isArray(comp.selectedShopIds) && comp.selectedShopIds.length > 0) {
            scope = comp.selectedShopIds.filter(Boolean);
          } else if (comp.companyId) {
            const tenants = await this.tenantRepo.find({
              where: { companyId: comp.companyId },
              select: ['id'],
            });
            scope = tenants.map((t) => t.id);
          }
        }
        if (scope.some((sid) => userShopIds.has(sid))) {
          userCompetitions.push({ comp, scopeShops: scope });
        }
      }

      if (userCompetitions.length === 0) continue;

      // Per ogni target, calcola pieces dell'utente vs targetPieces
      const targetGaps: Array<{
        compTitle: string;
        targetLabel: string;
        category: string | null;
        pieces: number;
        target: number;
        progress: number; // 0-100
        gapAbsolute: number;
      }> = [];

      for (const { comp } of userCompetitions) {
        for (const t of comp.targets || []) {
          const targetPieces = Number(t.targetPieces) || 0;
          if (targetPieces <= 0) continue;

          const userPiecesRaw = await this.entryRepo
            .createQueryBuilder('e')
            .select('COALESCE(SUM(e.pieces), 0)', 'pieces')
            .where('e.competitionId = :cid', { cid: comp.id })
            .andWhere('e.targetId = :tid', { tid: t.id })
            .andWhere('e.userId = :uid', { uid: userId })
            .getRawOne();

          const userPieces = parseInt(userPiecesRaw?.pieces ?? '0', 10) || 0;
          const progress = Math.round((userPieces / targetPieces) * 100);
          const gapAbsolute = Math.max(0, targetPieces - userPieces);

          targetGaps.push({
            compTitle: comp.title,
            targetLabel: t.label,
            category: t.category || null,
            pieces: userPieces,
            target: targetPieces,
            progress,
            gapAbsolute,
          });
        }
      }

      if (targetGaps.length === 0) continue;

      // Filtra: notifica solo se almeno un target ha progress < 90%
      const needsAttention = targetGaps.filter((g) => g.progress < 90);

      const firstName = (user.firstName || '').trim() || 'collega';
      let title: string;
      let message: string;

      if (needsAttention.length === 0) {
        // Tutto al 90%+, suggerisci di andare a vedere la gara per la spinta finale
        title = '🌟 Quasi al traguardo!';
        message =
          `Buongiorno ${firstName}! Sei al ${Math.min(...targetGaps.map((g) => g.progress))}%+ ` +
          `su tutti i target. Dai un'occhiata alle tue gare per vedere quali altri target ti aspettano.`;
      } else {
        // Ordina per progress crescente (più urgenti = meno progresso)
        needsAttention.sort((a, b) => a.progress - b.progress);
        const top3 = needsAttention.slice(0, 3);

        // Se sono tutti allo stesso livello, suggerisci di vedere la gara
        const allSameLevel = top3.length > 1 && top3.every((g) => g.progress === top3[0].progress);

        title = '🎯 Focus di oggi';
        const lines = [`Buongiorno ${firstName}! Ecco le priorità di oggi:`];
        top3.forEach((g, i) => {
          const icon = this.iconForCategory(g.category);
          const note =
            i === 0 && !allSameLevel
              ? ' — concentrati qui!'
              : i === 0 && allSameLevel
              ? ' — visualizza la gara per i dettagli'
              : '';
          lines.push(
            `${i + 1}. ${icon} ${g.targetLabel}: ${g.pieces}/${g.target} (${g.progress}%)${note}`,
          );
        });
        if (needsAttention.length > 3) {
          lines.push(`(altri ${needsAttention.length - 3} target attivi — vedi gare)`);
        }
        lines.push('Buona giornata 💪');
        message = lines.join('\n');
      }

      try {
        const linkComp = userCompetitions[0]?.comp;
        const notif = await this.notificationsService.create({
          tenantId: linkComp?.tenantId || (shopIds[0] ?? ''),
          userId,
          type: NotificationType.COMPETITION_REMINDER,
          title,
          message,
          linkUrl: linkComp ? `/operator/competitions/${linkComp.id}` : '/operator/competitions',
          linkLabel: 'Vedi gare',
        });
        emitNotification(userId, notif);
        sent++;
      } catch (err) {
        this.logger.warn(`[Cron] notifyDailyTargetPriority failed for user ${userId}:`, err);
      }
    }

    if (sent > 0) {
      this.logger.log(`[Cron] notifyDailyTargetPriority: sent ${sent} report notifications`);
    }
  }

  /** Icona di categoria per rendere il messaggio più scannerizzabile. */
  private iconForCategory(cat: string | null): string {
    switch (cat) {
      case 'MOBILE':
        return '📱';
      case 'FIXED_LINE':
        return '🏠';
      case 'ENERGY':
        return '⚡';
      case 'DEVICE':
        return '📦';
      default:
        return '🎯';
    }
  }
}
