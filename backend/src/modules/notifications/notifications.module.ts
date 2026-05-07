import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsCronService } from './notifications-cron.service';
import { Notification } from './entities/notification.entity';
import { Practice } from '../practices/entities/practice.entity';
import { Competition } from '../competitions/entities/competition.entity';
import { CompetitionEntry } from '../competitions/entities/competition-entry.entity';
import { CompetitionTarget } from '../competitions/entities/competition-target.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { UserShopMembership } from '../memberships/entities/user-shop-membership.entity';
import { User } from '../users/entities/user.entity';
// FIX Bug 3 — necessario per applicare JwtAuthGuard alle route REST.
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      Practice,
      Competition,
      CompetitionEntry,
      CompetitionTarget,
      Tenant,
      UserShopMembership,
      User,
    ]),
    AuthModule,
  ],
  providers: [NotificationsService, NotificationsCronService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
