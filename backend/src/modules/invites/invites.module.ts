import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Invite } from './entities/invite.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { UserShopMembership } from '../memberships/entities/user-shop-membership.entity';
import { InvitesService } from './invites.service';
import { InvitesController } from './invites.controller';
import { MembershipsModule } from '../memberships/memberships.module';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invite, Tenant, User, UserShopMembership]),
    MembershipsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [InvitesController],
  providers: [InvitesService, PermissionsGuard],
  exports: [InvitesService],
})
export class InvitesModule {}