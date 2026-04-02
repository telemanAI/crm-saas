import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantsController } from './tenants.controller';
import { SuperAdminTenantsController } from './super-admin-tenants.controller';
import { TenantsService } from './tenants.service';
import { Tenant } from './entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { Practice } from '../practices/entities/practice.entity';
import { Customer } from '../customers/entities/customer.entity'; // ? AGGIUNTO
import { UsersModule } from '../users/users.module';
import { ImportsModule } from '../imports/imports.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, User, Practice, Customer]), // ? AGGIUNTO Customer
    forwardRef(() => UsersModule),
    ImportsModule,
  ],
  controllers: [
    TenantsController,
    SuperAdminTenantsController,
  ],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}