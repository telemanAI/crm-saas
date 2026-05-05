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

  /**
   * Garantisce che il JWT abbia un tenantId valido prima di permettere
   * scritture sul DB. Sostituisce l'errore raw "null value in column tenantId"
   * di Postgres con un messaggio chiaro.
   *
   * Casi tipici in cui scattava:
   *  - JWT super-admin (tenantId=null) usato per pagine operatore
   *  - JWT vecchio issued prima del fix Phase E (storage chiave diversa)
   *  - sessione persa dopo refresh: getToken() leggeva la chiave sbagliata
   */
  private requireTenantId(req: any): string {
    const tid = req?.user?.tenantId;
    if (!tid) {
      throw new BadRequestException(
        'Nessun negozio attivo selezionato per questa sessione. Effettua di nuovo il login per scegliere un negozio.',
      );
    }
    return tid;
  }

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

  /**
   * Gruppi con i loro prodotti (per target gara DEVICE).
   * Restituisce solo prodotti isForSale=true con nome, quantità e prezzi.
   */
  @Get('groups-with-products')
  @RequirePermission('canViewProducts')
  async groupsWithProducts(@Req() req: any, @Query('q') q?: string) {
    const tenantId = req.user.tenantId;
    const groups = await this.groupsService.findAll(tenantId);
    const products = await this.productsService.findAll(tenantId, false, {
      isForSale: true,
      ...(q ? { q } : {}),
    });

    // Raggruppa prodotti per groupId
    const byGroup = new Map<string, typeof products>();
    for (const p of products) {
      const gid = p.groupId || 'ungrouped';
      if (!byGroup.has(gid)) byGroup.set(gid, []);
      byGroup.get(gid)!.push(p);
    }

    return groups.map((g) => ({
      ...g,
      products: byGroup.get(g.id) || [],
    })).filter((g) => g.products.length > 0 || !q); // se c'è ricerca, mostra solo gruppi con match
  }

  @Post('groups')
  @RequirePermission('canManageProducts')
  @HttpCode(HttpStatus.CREATED)
  createGroup(@Req() req: any, @Body() dto: CreateProductGroupDto) {
    return this.groupsService.create(this.requireTenantId(req), dto);
  }

  /**
   * Bulk reorder dei gruppi. IMPORTANTE: dichiarato PRIMA di `:id` per evitare
   * collisione con il ParseUUIDPipe sullo stesso prefisso.
   */
  @Patch('groups/reorder')
  @RequirePermission('canManageProducts')
  @HttpCode(HttpStatus.OK)
  reorderGroups(@Req() req: any, @Body() body: { items: { id: string; sortOrder: number }[] }) {
    return this.groupsService.reorder(this.requireTenantId(req), body.items);
  }

  @Patch('groups/:id')
  @RequirePermission('canManageProducts')
  updateGroup(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductGroupDto,
  ) {
    return this.groupsService.update(this.requireTenantId(req), id, dto);
  }

  @Delete('groups/:id')
  @RequirePermission('canManageProducts')
  @HttpCode(HttpStatus.OK)
  deleteGroup(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.groupsService.remove(this.requireTenantId(req), id);
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
    return this.productsService.create(this.requireTenantId(req), dto, req.user.userId);
  }

  @Patch('products/:id')
  @RequirePermission('canManageProducts')
  updateProduct(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(this.requireTenantId(req), id, dto, this.canSeeCost(req));
  }

  @Delete('products/:id')
  @RequirePermission('canManageProducts')
  @HttpCode(HttpStatus.OK)
  deleteProduct(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(this.requireTenantId(req), id);
  }

  /**
   * Restock o adjust manuale (es. carico fornitore, rettifiche inventario).
   */
  @Post('products/stock')
  @RequirePermission('canManageProducts')
  @HttpCode(HttpStatus.OK)
  stockMovement(@Req() req: any, @Body() dto: StockMovementDto) {
    return this.productsService.stockMovement(this.requireTenantId(req), dto, req.user.userId);
  }

  // ============================================================
  // VENDITE
  // ============================================================

  @Post('sales')
  @RequirePermission('canSellDevices')
  @HttpCode(HttpStatus.CREATED)
  sell(@Req() req: any, @Body() dto: SellProductDto) {
    return this.productsService.sell(this.requireTenantId(req), dto, req.user.userId);
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
