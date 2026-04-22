import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ImportsController } from './imports.controller';
import { SuperAdminImportsController } from './super-admin-imports.controller';
import { ImportsService } from './imports.service';
import { SuperAdminImportsService } from './super-admin-imports.service';
import { ImportJob } from './entities/import-job.entity';
import { ImportTemplate } from './entities/import-template.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Practice } from '../practices/entities/practice.entity';
import { FixedLineAdapter } from './adapters/fixed-line.adapter';
import { UnifiedAdapter } from './adapters/unified.adapter';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { MembershipsModule } from '../memberships/memberships.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ImportJob, ImportTemplate, Customer, Practice]),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  ],
  controllers: [
    ImportsController,
    SuperAdminImportsController,
  ],
  providers: [
    ImportsService,
    SuperAdminImportsService,
    FixedLineAdapter,
    UnifiedAdapter,
  ],
  exports: [ImportsService],
})
export class ImportsModule {}