import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WashReportController } from './wash-report.controller';
import { Practice } from '../practices/entities/practice.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { MembershipsModule } from '../memberships/memberships.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Practice, Tenant]),
    MembershipsModule, // ← Aggiunto: PermissionsGuard ha bisogno di MembershipsService
  ],
  controllers: [WashReportController],
})
export class ReportsModule {}