import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuperAdminController } from './super-admin.controller';
import { TenantsModule } from '../tenants/tenants.module';
import { UsersModule } from '../users/users.module';
import { MembershipsModule } from '../memberships/memberships.module';
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
    // MembershipsModule serve per i nuovi endpoint
    //   GET    /api/admin/tenants/:id/memberships
    //   PATCH  /api/admin/tenants/:id/memberships/:userId/role
    //   PATCH  /api/admin/tenants/:id/memberships/:userId/permissions
    //   DELETE /api/admin/tenants/:id/memberships/:userId
    //   POST   /api/admin/tenants/:id/memberships/:userId/reactivate
    MembershipsModule,
  ],
  controllers: [
    SuperAdminController,
  ],
})
export class SuperAdminModule {}