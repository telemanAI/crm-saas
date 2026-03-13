import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesPractice } from './entities/sales-practice.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SalesPractice])],
  exports: [TypeOrmModule],
})
export class SalesModule {}
