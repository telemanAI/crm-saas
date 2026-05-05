import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Competition } from './entities/competition.entity';
import { CompetitionTarget } from './entities/competition-target.entity';
import { CompetitionPrize } from './entities/competition-prize.entity';
import { CompetitionEntry } from './entities/competition-entry.entity';
import { Practice } from '../practices/entities/practice.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Offer } from '../offers/entities/offer.entity';
import { User } from '../users/entities/user.entity';
import { InventoryMovement } from '../inventory/entities/inventory-movement.entity';
import { CompetitionsService } from './services/competitions.service';
import { CompetitionEntriesService } from './services/competition-entries.service';
import { CompetitionsAutoMonthlyService } from './services/competitions-auto-monthly.service';
import { CompetitionsController } from './competitions.controller';
import { MembershipsModule } from '../memberships/memberships.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Competition,
      CompetitionTarget,
      CompetitionPrize,
      CompetitionEntry,
      Practice,
      Tenant,
      Offer,
      User, // CompetitionsService.enrichOperatorRanking() risolve i nomi dal DB
      InventoryMovement,
    ]),
    MembershipsModule,
  ],
  providers: [CompetitionsService, CompetitionEntriesService, CompetitionsAutoMonthlyService],
  controllers: [CompetitionsController],
  exports: [CompetitionEntriesService, CompetitionsService],
})
export class CompetitionsModule {}
