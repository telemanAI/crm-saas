import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashRegister } from './entities/cash-register.entity';
import { CashTransaction } from './entities/cash-transaction.entity';
import { CashClosing } from './entities/cash-closing.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CashRegister, CashTransaction, CashClosing])],
  exports: [TypeOrmModule],
})
export class CashModule {}
