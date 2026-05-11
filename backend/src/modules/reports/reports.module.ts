import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WashReportController } from './wash-report.controller';
import { PiecesReportController } from './pieces-report.controller';
import { PiecesReportService } from './pieces-report.service';
import { Practice } from '../practices/entities/practice.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { Offer } from '../offers/entities/offer.entity';
import { Customer } from '../customers/entities/customer.entity';
import { MembershipsModule } from '../memberships/memberships.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Practice, Tenant, User, Offer, Customer]),
    MembershipsModule, // PermissionsGuard ha bisogno di MembershipsService
  ],
  controllers: [WashReportController, PiecesReportController],
  providers: [PiecesReportService],
})
export class ReportsModule {}
