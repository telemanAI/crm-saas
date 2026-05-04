import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { ProductGroupsService } from './product-groups.service';
import { ProductsService } from './products.service';
import { InventorySalesService } from './inventory-sales.service';
import { CreateProductGroupDto } from './dto/create-product-group.dto';
import { UpdateProductGroupDto } from './dto/update-product-group.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SellProductDto } from './dto/sell-product.dto';
import { StockMovementDto } from './dto/stock-movement.dto';

/**
 * Controller principale dell'inventory.
 *
 * Strutturato in 3 aree:
 *  - /inventory/groups      → catalogo: gruppi prodotti (Telefoni, Accessori, ...)
 *  - /inventory/products    → catalogo: prodotti
 *  - /inventory/sales       → vendite e storico
 *
 * Permessi applicati:
 *  - canViewProducts        → GET liste/dettaglio
 *  - canManageProducts      → CRUD prodotti & gruppi, restock, modifica prezzo acquisto
 *  - canSellDevices         → registrare vendite
 *  - canViewAllDeviceSales  → vedere vendite di tutti gli operatori (altrimenti solo le proprie)
 */
@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(
    private readonly groupsService: ProductGroupsService,
    private readonly productsService: ProductsService,
    private readonly salesService: InventorySalesService,
  ) {}

  // ============================================================
  // GRUPPI PRODOTTI
  // ============================================================

  @Get('groups')
  @RequirePermission('canViewProducts')
  listGroups(@Req() req: any) {
    return this.groupsService.findAll(req.user.tenantId);
  }

  @Get('groups/:id')
  @RequirePermission('canViewProducts')
  getGroup(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.groupsService.findOne(req.user.tenantId, id);
  }

  @Post('groups')
  @RequirePermission('canManageProducts')
  @HttpCode(HttpStatus.CREATED)
  createGroup(@Req() req: any, @Body() dto: CreateProductGroupDto) {
    // Phase G — Defensive: stesso safety check del create product
    if (!req.user?.tenantId) {
      throw new BadRequestException(
        'Nessuno shop attivo. Fai logout e login per rigenerare la sessione.',
      );
    }
    return this.groupsService.create(req.user.tenantId, dto);
  }

  /**
   * Bulk reorder dei gruppi. IMPORTANTE: dichiarato PRIMA di `:id` per evitare
   * collisione con il ParseUUIDPipe sullo stesso prefisso.
   */
  @Patch('groups/reorder')
  @RequirePermission('canManageProducts')
  @HttpCode(HttpStatus.OK)
  reorderGroups(@Req() req: any, @Body() body: { items: { id: string; sortOrder: number }[] }) {
    return this.groupsService.reorder(req.user.tenantId, body.items);
  }

  @Patch('groups/:id')
  @RequirePermission('canManageProducts')
  updateGroup(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductGroupDto,
  ) {
    return this.groupsService.update(req.user.tenantId, id, dto);
  }

  @Delete('groups/:id')
  @RequirePermission('canManageProducts')
  @HttpCode(HttpStatus.OK)
  deleteGroup(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.groupsService.remove(req.user.tenantId, id);
  }

  // ============================================================
  // PRODOTTI
  // ============================================================

  @Get('products')
  @RequirePermission('canViewProducts')
  listProducts(
    @Req() req: any,
    @Query('groupId') groupId?: string,
    @Query('isForSale') isForSale?: string,
    @Query('q') q?: string,
  ) {
    const canSeeCost = this.canSeeCost(req);
    const filters: any = {};
    if (groupId) filters.groupId = groupId;
    if (isForSale !== undefined) filters.isForSale = isForSale === 'true';
    if (q) filters.q = q;
    return this.productsService.findAll(req.user.tenantId, canSeeCost, filters);
  }

  @Get('products/:id')
  @RequirePermission('canViewProducts')
  getProduct(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(req.user.tenantId, id, this.canSeeCost(req));
  }

  @Post('products')
  @RequirePermission('canManageProducts')
  @HttpCode(HttpStatus.CREATED)
  createProduct(@Req() req: any, @Body() dto: CreateProductDto) {
    // Phase G — Defensive: errore chiaro invece di crash PostgreSQL
    if (!req.user?.tenantId) {
      throw new BadRequestException(
        'Nessuno shop attivo. Fai logout e login per rigenerare la sessione, oppure seleziona uno shop dallo switcher in alto a destra.',
      );
    }
    return this.productsService.create(req.user.tenantId, dto, req.user.userId);
  }

  @Patch('products/:id')
  @RequirePermission('canManageProducts')
  updateProduct(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(req.user.tenantId, id, dto, this.canSeeCost(req));
  }

  @Delete('products/:id')
  @RequirePermission('canManageProducts')
  @HttpCode(HttpStatus.OK)
  deleteProduct(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(req.user.tenantId, id);
  }

  /**
   * Restock o adjust manuale (es. carico fornitore, rettifiche inventario).
   */
  @Post('products/stock')
  @RequirePermission('canManageProducts')
  @HttpCode(HttpStatus.OK)
  stockMovement(@Req() req: any, @Body() dto: StockMovementDto) {
    return this.productsService.stockMovement(req.user.tenantId, dto, req.user.userId);
  }

  // ============================================================
  // VENDITE
  // ============================================================

  @Post('sales')
  @RequirePermission('canSellDevices')
  @HttpCode(HttpStatus.CREATED)
  sell(@Req() req: any, @Body() dto: SellProductDto) {
    return this.productsService.sell(req.user.tenantId, dto, req.user.userId);
  }

  @Get('sales')
  @RequirePermission('canSellDevices')
  listSales(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('soldByUserId') soldByUserId?: string,
    @Query('customerId') customerId?: string,
    @Query('practiceId') practiceId?: string,
    @Query('itemId') itemId?: string,
  ) {
    const restrictToUserId = this.shouldRestrictToOwnSales(req) ? req.user.userId : null;
    const filters: any = {};
    if (from) filters.from = new Date(from);
    if (to) filters.to = new Date(to);
    if (soldByUserId) filters.soldByUserId = soldByUserId;
    if (customerId) filters.customerId = customerId;
    if (practiceId) filters.practiceId = practiceId;
    if (itemId) filters.itemId = itemId;
    return this.salesService.listSales(req.user.tenantId, filters, restrictToUserId);
  }

  @Get('sales/summary')
  @RequirePermission('canSellDevices')
  salesSummary(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('soldByUserId') soldByUserId?: string,
  ) {
    const restrictToUserId = this.shouldRestrictToOwnSales(req) ? req.user.userId : null;
    const includeMargins = this.canSeeCost(req);
    const filters: any = {};
    if (from) filters.from = new Date(from);
    if (to) filters.to = new Date(to);
    if (soldByUserId) filters.soldByUserId = soldByUserId;
    return this.salesService.summary(req.user.tenantId, filters, includeMargins, restrictToUserId);
  }

  // ============================================================
  // HELPERS PERMESSI
  // ============================================================

  /**
   * canSeeCost: founder/admin con `canManageProducts` vedono prezzo acquisto e margini.
   * SUPER_ADMIN, FOUNDER hanno bypass, ADMIN/OPERATOR dipendono dal permesso.
   */
  private canSeeCost(req: any): boolean {
    if (req.user.role === 'SUPER_ADMIN' || req.activeMembershipRole === 'FOUNDER') return true;
    const perms = req.membershipPermissions || {};
    return perms.canManageProducts === true;
  }

  /**
   * Se l'utente NON ha canViewAllDeviceSales, vede solo le proprie vendite.
   */
  private shouldRestrictToOwnSales(req: any): boolean {
    if (req.user.role === 'SUPER_ADMIN' || req.activeMembershipRole === 'FOUNDER') return false;
    const perms = req.membershipPermissions || {};
    return perms.canViewAllDeviceSales !== true;
  }
}
