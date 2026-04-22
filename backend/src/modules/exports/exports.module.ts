import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportsService } from './exports.service';
import { ExportsController } from './exports.controller';
import { AdminExportsController } from './admin-exports.controller'; // ✅ NUOVO
import { Practice } from '../practices/entities/practice.entity';
import { Customer } from '../customers/entities/customer.entity';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { MembershipsModule } from '../memberships/memberships.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Practice, Customer]),
    MembershipsModule,
  ],
  controllers: [
    ExportsController,
    AdminExportsController, // ✅ NUOVO
  ],
  providers: [ExportsService],
})
export class ExportsModule {}