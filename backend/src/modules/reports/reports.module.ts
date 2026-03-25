import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WashReportController } from './wash-report.controller';
import { Practice } from '../practices/entities/practice.entity';
import { Tenant } from '../tenants/entities/tenant.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Practice, Tenant])],
  controllers: [WashReportController],
})
export class ReportsModule {}