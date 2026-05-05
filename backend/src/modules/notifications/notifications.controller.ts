import {
  Controller,
  Get,
  Patch,
  Param,
  Req,
  Sse,
  MessageEvent,
  Query,
} from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { NotificationsService } from './notifications.service';

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

  /** SSE stream — connessione persistente per notifiche real-time. */
  @Sse('stream')
  stream(@Req() req: any): Observable<MessageEvent> {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) {
      throw new Error('Utente non autenticato');
    }
    const subject = new Subject<MessageEvent>();
    sseClients.set(userId, subject);

    // Heartbeat ogni 30s per tenere aperta la connessione
    const heartbeat = setInterval(() => {
      subject.next({ data: JSON.stringify({ type: 'ping' }) } as MessageEvent);
    }, 30000);

    // Cleanup quando il client disconnette
    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(userId);
      subject.complete();
    });

    return subject.asObservable();
  }

  @Get()
  async list(
    @Req() req: any,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user?.id || req.user?.sub;
    return this.service.findByUser(userId, {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit, 10) : 30,
    });
  }

  @Get('count')
  async countUnread(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return { count: await this.service.countUnread(userId) };
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.service.markAsRead(id, userId);
  }

  @Patch('read-all')
  async markAllRead(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.service.markAllAsRead(userId);
  }
}
