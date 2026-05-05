import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsCronService } from './notifications-cron.service';
import { Notification } from './entities/notification.entity';
import { Practice } from '../practices/entities/practice.entity';
import { Competition } from '../competitions/entities/competition.entity';
import { CompetitionEntry } from '../competitions/entities/competition-entry.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, Practice, Competition, CompetitionEntry])],
  providers: [NotificationsService, NotificationsCronService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
