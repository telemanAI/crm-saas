import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Offer } from './entities/offer.entity';
import { OffersService } from './offers.service';
import { OffersController, AdminOffersController } from './offers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Offer])],
  controllers: [OffersController, AdminOffersController],
  providers: [OffersService],
  exports: [OffersService],
})
export class OffersModule {}