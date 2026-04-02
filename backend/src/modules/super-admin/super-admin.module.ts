import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminStatsController } from './super-admin-stats.controller';
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
    forwardRef(() => TenantsModule), // ✅ TenantsService disponibile
    forwardRef(() => UsersModule),   // ✅ UsersService disponibile
  ],
  controllers: [
    SuperAdminController,
    SuperAdminStatsController,
  ],
})
export class SuperAdminModule {}