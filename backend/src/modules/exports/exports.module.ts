import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportsService } from './exports.service';
import { ExportsController } from './exports.controller';
import { AdminExportsController } from './admin-exports.controller';
import { Practice } from '../practices/entities/practice.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { Offer } from '../offers/entities/offer.entity';
import { PiecesReportService } from '../reports/pieces-report.service';
import { MembershipsModule } from '../memberships/memberships.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Practice, Customer, Tenant, User, Offer]),
    MembershipsModule,
  ],
  controllers: [
    ExportsController,
    AdminExportsController,
  ],
  providers: [ExportsService, PiecesReportService],
})
export class ExportsModule {}