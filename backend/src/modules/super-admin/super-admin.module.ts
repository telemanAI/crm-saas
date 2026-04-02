import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuperAdminController } from './super-admin.controller';
import { TenantsModule } from '../tenants/tenants.module';
import { UsersModule } from '../users/users.module';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { Practice } from '../practices/entities/practice.entity';
import { Customer } from '../customers/entities/customer.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, User, Practice, Customer, AuditLog]),
    forwardRef(() => TenantsModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [
    SuperAdminController,
    // ✅ RIMOSSO: SuperAdminStatsController è già registrato in StatsModule
  ],
})
export class SuperAdminModule {}