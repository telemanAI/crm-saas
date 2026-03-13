import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { Customer } from '../customers/entities/customer.entity';
import { Practice } from '../practices/entities/practice.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, Practice]),
  ],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}