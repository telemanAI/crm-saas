import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryItem } from './entities/inventory-item.entity';
import { InventoryMovement } from './entities/inventory-movement.entity';
import { ProductGroup } from './entities/product-group.entity';
import { ProductCustomField } from './entities/product-custom-field.entity';
import { InventoryController } from './inventory.controller';
import { ProductGroupsService } from './product-groups.service';
import { ProductsService } from './products.service';
import { InventorySalesService } from './inventory-sales.service';
import { MembershipsModule } from '../memberships/memberships.module';
// Phase H — repos per fallback tenantId blindato
import { User } from '../users/entities/user.entity';
import { UserShopMembership } from '../memberships/entities/user-shop-membership.entity';
// FIX Bug 2 — necessario per syncDeviceSaleEntries alla vendita.
// Senza questo import, ProductsService riceve `competitionEntries=undefined`
// (è @Optional()) → il sync non parte → la gara non si aggiorna.
import { CompetitionsModule } from '../competitions/competitions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryItem,
      InventoryMovement,
      ProductGroup,
      ProductCustomField,
      User,
      UserShopMembership,
    ]),
    MembershipsModule,
    forwardRef(() => CompetitionsModule),
  ],
  controllers: [InventoryController],
  providers: [ProductGroupsService, ProductsService, InventorySalesService],
  exports: [TypeOrmModule, ProductsService],
})
export class InventoryModule {}
