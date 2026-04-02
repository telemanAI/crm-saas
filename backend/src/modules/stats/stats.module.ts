import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { SuperAdminStatsController } from './super-admin-stats.controller'; // ✅ NUOVO
import { AuditLog } from '../audit/entities/audit-log.entity';
import { TenantsModule } from '../tenants/tenants.module';
import { UsersModule } from '../users/users.module';
import { PracticesModule } from '../practices/practices.module';
import { CustomersModule } from '../customers/customers.module';
import { ImportsModule } from '../imports/imports.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog]),
    TenantsModule,
    UsersModule,
    PracticesModule,
    CustomersModule,
    ImportsModule,
  ],
  controllers: [
    StatsController,
    SuperAdminStatsController, // ✅ NUOVO
  ],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}