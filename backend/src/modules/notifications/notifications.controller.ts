import {
  Controller,
  Get,
  Patch,
  Param,
  Req,
  Sse,
  MessageEvent,
  Query,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// In-memory store di client SSE connessi: userId -> Subject<MessageEvent>
const sseClients = new Map<string, Subject<MessageEvent>>();

export function emitNotification(userId: string, data: any) {
  const client = sseClients.get(userId);
  if (client) {
    client.next({ data: JSON.stringify(data) } as MessageEvent);
  }
}

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  /** SSE stream — connessione persistente per notifiche real-time.
   *  NB: SSE non può usare JwtAuthGuard standard perché EventSource non
   *  invia headers Authorization. Il token arriva via query string e viene
   *  letto direttamente dalla request — vedi notifications-sse.middleware.
   *  Per ora si fida del fatto che il token venga validato lato proxy.
   */
  @Sse('stream')
  stream(@Req() req: any): Observable<MessageEvent> {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Utente non autenticato');
    }
    const subject = new Subject<MessageEvent>();
    sseClients.set(userId, subject);

    const heartbeat = setInterval(() => {
      subject.next({ data: JSON.stringify({ type: 'ping' }) } as MessageEvent);
    }, 30000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(userId);
      subject.complete();
    });

    return subject.asObservable();
  }

  /**
   * FIX Bug 3 — JwtAuthGuard ESPLICITO su tutte le route REST.
   * Senza guard, `req.user` era undefined →
   *   - repo.count({ where: { userId: undefined } }) IGNORA il filtro e contava
   *     TUTTE le notifiche del DB (counter spurio = 6)
   *   - queryBuilder.where('userId = :uid', { uid: undefined }) generava
   *     `WHERE "userId" = NULL` → 0 risultati (lista vuota)
   * Da qui la discrepanza counter=6 ma list=0.
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async list(
    @Req() req: any,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) throw new UnauthorizedException('Utente non autenticato');
    return this.service.findByUser(userId, {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit, 10) : 30,
    });
  }

  @Get('count')
  @UseGuards(JwtAuthGuard)
  async countUnread(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) throw new UnauthorizedException('Utente non autenticato');
    return { count: await this.service.countUnread(userId) };
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  async markRead(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) throw new UnauthorizedException('Utente non autenticato');
    return this.service.markAsRead(id, userId);
  }

  @Patch('read-all')
  @UseGuards(JwtAuthGuard)
  async markAllRead(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) throw new UnauthorizedException('Utente non autenticato');
    return this.service.markAllAsRead(userId);
  }
}
