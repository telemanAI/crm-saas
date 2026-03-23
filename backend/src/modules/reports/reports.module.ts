import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WashReportController } from './wash-report.controller';
import { SalesPractice } from '../practices/entities/practice.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SalesPractice])],
  controllers: [WashReportController],
})
export class ReportsModule {}