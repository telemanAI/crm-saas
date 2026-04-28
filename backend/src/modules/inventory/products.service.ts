import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, ILike } from 'typeorm';
import { InventoryItem } from './entities/inventory-item.entity';
import { InventoryMovement } from './entities/inventory-movement.entity';
import { ProductGroup } from './entities/product-group.entity';
import { ProductCustomField } from './entities/product-custom-field.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SellProductDto } from './dto/sell-product.dto';
import { StockMovementDto } from './dto/stock-movement.dto';

export type StockStatus = 'OK' | 'LOW' | 'OUT';

export interface ProductView {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  groupId: string | null;
  groupName: string | null;
  customFields: Record<string, any> | null;
  isForSale: boolean;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderLevel: number;
  unitCost: number | null; // null se l'utente non può vederlo
  sellingPrice: number | null;
  margin: number | null;   // null se non può vederlo
  marginPercent: number | null;
  stockStatus: StockStatus;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(InventoryItem)
    private readonly itemRepo: Repository<InventoryItem>,
    @InjectRepository(InventoryMovement)
    private readonly movementRepo: Repository<InventoryMovement>,
    @InjectRepository(ProductGroup)
    private readonly groupRepo: Repository<ProductGroup>,
    @InjectRepository(ProductCustomField)
    private readonly fieldRepo: Repository<ProductCustomField>,
    private readonly dataSource: DataSource,
  ) {}

  // ============ READ ============

  async findAll(
    tenantId: string,
    canSeeCost: boolean,
    filters: { groupId?: string; isForSale?: boolean; q?: string } = {},
  ): Promise<ProductView[]> {
    const qb = this.itemRepo
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.group', 'group')
      .where('item.tenantId = :tenantId', { tenantId });

    if (filters.groupId) qb.andWhere('item.groupId = :groupId', { groupId: filters.groupId });
    if (filters.isForSale !== undefined) qb.andWhere('item.isForSale = :isForSale', { isForSale: filters.isForSale });
    if (filters.q) qb.andWhere('(item.name ILIKE :q OR item.sku ILIKE :q)', { q: `%${filters.q}%` });

    qb.orderBy('group.sortOrder', 'ASC')
      .addOrderBy('item.name', 'ASC');

    const items = await qb.getMany();
    return items.map((it) => this.toView(it, canSeeCost));
  }

  async findOne(tenantId: string, id: string, canSeeCost: boolean): Promise<ProductView> {
    const item = await this.itemRepo.findOne({
      where: { id, tenantId },
      relations: ['group'],
    });
    if (!item) throw new NotFoundException('Prodotto non trovato');
    return this.toView(item, canSeeCost);
  }

  // ============ WRITE ============

  async create(tenantId: string, dto: CreateProductDto, performedBy: string): Promise<ProductView> {
    if (dto.groupId) await this.assertGroupExists(tenantId, dto.groupId);
    if (dto.customFields && dto.groupId) {
      await this.validateCustomFields(dto.groupId, dto.customFields);
    }

    const sku = dto.sku?.trim() || (await this.generateSku(tenantId, dto.name));
    const item = this.itemRepo.create({
      tenantId,
      sku,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      category: dto.category?.trim() || null,
      groupId: dto.groupId || null,
      customFields: dto.customFields || null,
      isForSale: dto.isForSale ?? true,
      quantity: dto.quantity ?? 0,
      reorderLevel: dto.reorderLevel ?? 5,
      unitCost: dto.unitCost ?? null,
      sellingPrice: dto.sellingPrice ?? null,
    });
    const saved = await this.itemRepo.save(item);

    // Se entry con quantity > 0, registriamo un movimento PURCHASE iniziale
    if ((dto.quantity ?? 0) > 0) {
      await this.movementRepo.save(
        this.movementRepo.create({
          tenantId,
          itemId: saved.id,
          movementType: 'PURCHASE',
          quantity: dto.quantity!,
          unitCost: dto.unitCost ?? null,
          referenceType: 'INITIAL_STOCK',
          performedBy,
          notes: 'Stock iniziale alla creazione del prodotto',
        }),
      );
    }

    return this.findOne(tenantId, saved.id, true);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateProductDto,
    canEditCost: boolean,
  ): Promise<ProductView> {
    const item = await this.itemRepo.findOne({ where: { id, tenantId } });
    if (!item) throw new NotFoundException('Prodotto non trovato');

    if (dto.groupId !== undefined) {
      if (dto.groupId) await this.assertGroupExists(tenantId, dto.groupId);
      item.groupId = dto.groupId || null;
    }
    if (dto.customFields !== undefined) {
      const targetGroup = item.groupId;
      if (targetGroup && dto.customFields) {
        await this.validateCustomFields(targetGroup, dto.customFields);
      }
      item.customFields = dto.customFields || null;
    }
    if (dto.name !== undefined) item.name = dto.name.trim();
    if (dto.description !== undefined) item.description = dto.description?.trim() || null;
    if (dto.category !== undefined) item.category = dto.category?.trim() || null;
    if (dto.sku !== undefined) item.sku = dto.sku.trim();
    if (dto.isForSale !== undefined) item.isForSale = dto.isForSale;
    if (dto.reorderLevel !== undefined) item.reorderLevel = dto.reorderLevel;
    if (dto.sellingPrice !== undefined) item.sellingPrice = dto.sellingPrice;

    // unitCost modificabile solo da chi ha canManageProducts (controllato dal controller).
    // Qui aggiungiamo doppia rete di sicurezza:
    if (dto.unitCost !== undefined) {
      if (!canEditCost) {
        throw new BadRequestException('Non hai i permessi per modificare il prezzo di acquisto');
      }
      item.unitCost = dto.unitCost;
    }

    item.updatedAt = new Date();
    await this.itemRepo.save(item);
    return this.findOne(tenantId, id, true);
  }

  async remove(tenantId: string, id: string): Promise<{ message: string }> {
    const item = await this.itemRepo.findOne({ where: { id, tenantId } });
    if (!item) throw new NotFoundException('Prodotto non trovato');
    // Soft delete: in realtà rimuoviamo dal catalogo (movements restano per storico)
    await this.itemRepo.remove(item);
    return { message: 'Prodotto eliminato' };
  }

  // ============ STOCK MOVEMENTS ============

  /**
   * Restock o adjust manuale. Aggiorna quantity e crea InventoryMovement.
   */
  async stockMovement(
    tenantId: string,
    dto: StockMovementDto,
    performedBy: string,
  ): Promise<ProductView> {
    return this.dataSource.transaction(async (manager) => {
      const itemRepo = manager.getRepository(InventoryItem);
      const movRepo = manager.getRepository(InventoryMovement);

      const item = await itemRepo.findOne({ where: { id: dto.itemId, tenantId } });
      if (!item) throw new NotFoundException('Prodotto non trovato');

      const delta =
        dto.movementType === 'PURCHASE' || dto.movementType === 'ADJUST_IN'
          ? dto.quantity
          : -dto.quantity;

      const newQuantity = item.quantity + delta;
      if (newQuantity < 0) {
        throw new BadRequestException(
          `Stock insufficiente: hai ${item.quantity}, stai sottraendo ${dto.quantity}`,
        );
      }

      item.quantity = newQuantity;
      // Se è un PURCHASE con prezzo, aggiorna il prezzo medio di acquisto (semplificato: ultimo prezzo)
      if (dto.movementType === 'PURCHASE' && dto.unitCost !== undefined) {
        item.unitCost = dto.unitCost;
      }
      item.updatedAt = new Date();
      await itemRepo.save(item);

      await movRepo.save(
        movRepo.create({
          tenantId,
          itemId: item.id,
          movementType: dto.movementType,
          quantity: dto.quantity,
          unitCost: dto.unitCost ?? null,
          performedBy,
          notes: dto.notes || null,
        }),
      );

      return this.findOne(tenantId, item.id, true);
    });
  }

  // ============ SALES ============

  /**
   * Vendita di un prodotto. Decrementa stock, crea movement con
   * eventuale collegamento a customer/practice.
   */
  async sell(
    tenantId: string,
    dto: SellProductDto,
    performedBy: string,
  ): Promise<{ movement: InventoryMovement; product: ProductView }> {
    return this.dataSource.transaction(async (manager) => {
      const itemRepo = manager.getRepository(InventoryItem);
      const movRepo = manager.getRepository(InventoryMovement);

      const item = await itemRepo.findOne({ where: { id: dto.itemId, tenantId } });
      if (!item) throw new NotFoundException('Prodotto non trovato');
      if (!item.isForSale) {
        throw new BadRequestException('Questo prodotto non è in vendita');
      }
      if (item.quantity < dto.quantity) {
        throw new BadRequestException(
          `Stock insufficiente: disponibili ${item.quantity}, richiesti ${dto.quantity}`,
        );
      }

      const unitSalePrice = dto.unitSalePrice ?? Number(item.sellingPrice ?? 0);

      item.quantity -= dto.quantity;
      item.updatedAt = new Date();
      await itemRepo.save(item);

      const movement = await movRepo.save(
        movRepo.create({
          tenantId,
          itemId: item.id,
          movementType: 'SALE',
          quantity: dto.quantity,
          unitCost: item.unitCost ?? null,
          unitSalePrice,
          performedBy,
          soldByUserId: performedBy,
          customerId: dto.customerId || null,
          practiceId: dto.practiceId || null,
          referenceType: dto.practiceId ? 'PRACTICE' : dto.customerId ? 'CUSTOMER' : null,
          referenceId: dto.practiceId || dto.customerId || null,
          notes: dto.notes || null,
        }),
      );

      const product = await this.findOne(tenantId, item.id, true);
      return { movement, product };
    });
  }

  // ============ HELPERS ============

  private toView(item: InventoryItem, canSeeCost: boolean): ProductView {
    const unitCost = canSeeCost ? (item.unitCost !== null ? Number(item.unitCost) : null) : null;
    const sellingPrice = item.sellingPrice !== null ? Number(item.sellingPrice) : null;
    const margin =
      canSeeCost && unitCost !== null && sellingPrice !== null ? sellingPrice - unitCost : null;
    const marginPercent =
      margin !== null && sellingPrice && sellingPrice > 0
        ? Math.round((margin / sellingPrice) * 1000) / 10
        : null;

    const availableQuantity = item.quantity - item.reservedQuantity;
    let stockStatus: StockStatus = 'OK';
    if (item.quantity <= 0) stockStatus = 'OUT';
    else if (item.quantity <= item.reorderLevel) stockStatus = 'LOW';

    return {
      id: item.id,
      sku: item.sku,
      name: item.name,
      description: item.description,
      category: item.category,
      groupId: item.groupId,
      groupName: item.group?.name ?? null,
      customFields: item.customFields,
      isForSale: item.isForSale,
      quantity: item.quantity,
      reservedQuantity: item.reservedQuantity,
      availableQuantity,
      reorderLevel: item.reorderLevel,
      unitCost,
      sellingPrice,
      margin,
      marginPercent,
      stockStatus,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private async assertGroupExists(tenantId: string, groupId: string) {
    const ok = await this.groupRepo.findOne({ where: { id: groupId, tenantId } });
    if (!ok) throw new BadRequestException('Gruppo non valido');
  }

  private async validateCustomFields(groupId: string, values: Record<string, any>) {
    const fields = await this.fieldRepo.find({ where: { groupId } });
    for (const f of fields) {
      if (f.isRequired && (values[f.fieldKey] === undefined || values[f.fieldKey] === '')) {
        throw new BadRequestException(`Campo "${f.fieldLabel}" obbligatorio`);
      }
    }
  }

  private async generateSku(tenantId: string, name: string): Promise<string> {
    const base = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 8);
    const count = await this.itemRepo.count({ where: { tenantId } });
    return `${base || 'PRD'}-${String(count + 1).padStart(4, '0')}`;
  }
}
