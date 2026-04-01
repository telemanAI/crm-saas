import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantsController } from './tenants.controller';
import { SuperAdminTenantsController } from './super-admin-tenants.controller'; // ← AGGIUNGI
import { TenantsService } from './tenants.service';
import { Tenant } from './entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module'; // ← AGGIUNGI (se non c'è)
import { ImportsModule } from '../imports/imports.module'; // ← AGGIUNGI (se non c'è)

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, User]),
    UsersModule, // ← AGGIUNGI
    ImportsModule, // ← AGGIUNGI
  ],
  controllers: [
    TenantsController,
    SuperAdminTenantsController, // ← AGGIUNGI
  ],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}