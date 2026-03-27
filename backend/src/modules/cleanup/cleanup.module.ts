import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CleanupService } from './cleanup.service';
import { User } from '../users/entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Practice } from '../practices/entities/practice.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(), // Abilita i cron job
    TypeOrmModule.forFeature([User, Tenant, Practice]),
  ],
  providers: [CleanupService],
  exports: [CleanupService],
})
export class CleanupModule {}