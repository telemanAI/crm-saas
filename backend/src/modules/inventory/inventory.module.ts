import { Module } from '@nestjs/common';
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
  ],
  controllers: [InventoryController],
  providers: [ProductGroupsService, ProductsService, InventorySalesService],
  exports: [TypeOrmModule, ProductsService],
})
export class InventoryModule {}
