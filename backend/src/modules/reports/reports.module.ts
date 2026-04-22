import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WashReportController } from './wash-report.controller';
import { Practice } from '../practices/entities/practice.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { MembershipsModule } from '../memberships/memberships.module';

@Module({
  imports: [TypeOrmModule.forFeature([Practice, Tenant])], // âœ… AGGIUNTO Tenant
  controllers: [WashReportController],
})
export class ReportsModule {}