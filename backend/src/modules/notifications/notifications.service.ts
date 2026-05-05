import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  async create(data: {
    tenantId: string;
    companyId?: string | null;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    linkUrl?: string | null;
    linkLabel?: string | null;
    metadata?: Record<string, any> | null;
  }): Promise<Notification> {
    const n = this.repo.create({
      tenantId: data.tenantId,
      companyId: data.companyId ?? null,
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      linkUrl: data.linkUrl ?? null,
      linkLabel: data.linkLabel ?? null,
      metadata: data.metadata ?? null,
      isRead: false,
      readAt: null,
    });
    return this.repo.save(n);
  }

  async findByUser(userId: string, opts?: { limit?: number; unreadOnly?: boolean }) {
    const qb = this.repo
      .createQueryBuilder('n')
      .where('n.userId = :uid', { uid: userId })
      .orderBy('n.createdAt', 'DESC');
    if (opts?.unreadOnly) {
      qb.andWhere('n.isRead = false');
    }
    if (opts?.limit) {
      qb.limit(opts.limit);
    }
    return qb.getMany();
  }

  async countUnread(userId: string): Promise<number> {
    return this.repo.count({ where: { userId, isRead: false } });
  }

  async markAsRead(id: string, userId: string): Promise<{ affected: boolean }> {
    const res = await this.repo.update(
      { id, userId },
      { isRead: true, readAt: new Date() },
    );
    return { affected: (res.affected ?? 0) > 0 };
  }

  async markAllAsRead(userId: string): Promise<{ affected: number }> {
    const res = await this.repo.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
    return { affected: res.affected ?? 0 };
  }
}
