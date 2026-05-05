import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef, Optional } from '@nestjs/common';
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
// Phase H — fallback tenantId blindato
import { User } from '../users/entities/user.entity';
import { UserShopMembership } from '../memberships/entities/user-shop-membership.entity';
import { CompetitionEntriesService } from '../competitions/services/competition-entries.service';

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
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserShopMembership)
    private readonly membershipRepo: Repository<UserShopMembership>,
    private readonly dataSource: DataSource,
    @Optional()
    private readonly competitionEntries?: CompetitionEntriesService,
  ) {}

  /**
   * Phase H — fallback BLINDATO per tenantId.
   *
   * In produzione abbiamo visto utenti (founder legacy) che arrivano qui con
   * `tenantId = null` perché:
   *  - JWT vecchio prima della Tappa 0 multi-shop;
   *  - users.tenant_id valorizzato ma nessuna riga in user_shop_memberships;
   *  - Phase G/G2 non deployate sul backend Railway.
   *
   * Questa funzione è chiamata SEMPRE prima di INSERT su inventory_items
   * e cerca il tenantId in 3 posti, in ordine:
   *  1. Il valore passato (caso normale)
   *  2. users.tenant_id (founder legacy)
   *  3. Prima membership attiva dell'utente
   *  4. Errore esplicito 400 con messaggio chiaro (NON crash PostgreSQL)
   */
  private async resolveTenantId(rawTenantId: string | null | undefined, userId: string): Promise<string> {
    if (rawTenantId) return rawTenantId;

    // 2) users.tenant_id
    const u = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'tenantId'],
    });
    if (u?.tenantId) {
      // eslint-disable-next-line no-console
      console.warn(`[ProductsService] tenantId fallback users.tenantId per user ${userId}`);
      return u.tenantId;
    }

    // 3) Prima membership attiva
    const m = await this.membershipRepo.findOne({
      where: { userId, isActive: true },
      order: { joinedAt: 'ASC' },
    });
    if (m?.shopId) {
      // eslint-disable-next-line no-console
      console.warn(`[ProductsService] tenantId fallback membership per user ${userId} → shopId=${m.shopId}`);
      return m.shopId;
    }

    throw new BadRequestException(
      'Nessuno shop attivo per il tuo utente. Contatta il super amministratore: ' +
        'manca la membership in user_shop_memberships. ' +
        '(workaround: logout + login con il tasto "Cambia negozio" dopo)',
    );
  }

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
    // Phase H — fallback BLINDATO: garantisce tenantId valido prima del save
    tenantId = await this.resolveTenantId(tenantId, performedBy);

    if (dto.groupId) await this.assertGroupExists(tenantId, dto.groupId);
    if (dto.customFields && dto.groupId) {
      await this.validateCustomFields(dto.groupId, dto.customFields);
    }

    const sku = dto.sku?.trim() || (await this.generateSku(tenantId, dto.name));

    // fix-final5 — log diagnostico esplicito: se qualcosa va storto nel save,
    // vogliamo capirlo subito dai log Railway senza dover arrivare al client
    // un crash anonimo.
    try {
      // FIX BULLETPROOF-2: raw SQL con log estremo + fallback se RETURNING fallisce.
      // Convertiamo esplicitamente tutti i valori per evitare undefined che
      // potrebbero confondere il driver pg.
      const params = [
        tenantId,                       // $1 tenant_id
        sku,                            // $2 sku
        dto.name.trim(),                // $3 name
        dto.description?.trim() || null, // $4 description
        dto.category?.trim() || null,   // $5 category
        Number(dto.quantity ?? 0),      // $6 quantity
        0,                              // $7 reserved_quantity
        Number(dto.reorderLevel ?? 5),  // $8 reorder_level
        dto.unitCost != null ? Number(dto.unitCost) : null,  // $9 unit_cost
        dto.sellingPrice != null ? Number(dto.sellingPrice) : null, // $10 selling_price
        dto.groupId || null,            // $11 group_id
        dto.customFields ? JSON.stringify(dto.customFields) : null, // $12 custom_fields
        dto.isForSale === false ? false : true, // $13 is_for_sale
        null,                           // $14 supplier_info
      ];

      // eslint-disable-next-line no-console
      console.log('[ProductsService.create] RAW SQL params:', params);

      let insertResult: any;
      try {
        insertResult = await this.dataSource.query(
          `INSERT INTO inventory_items
            (tenant_id, sku, name, description, category,
             quantity, reserved_quantity, reorder_level,
             unit_cost, selling_price, group_id, custom_fields,
             is_for_sale, supplier_info, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
           RETURNING id`,
          params,
        );
      } catch (rawErr: any) {
        // eslint-disable-next-line no-console
        console.error('[ProductsService.create] RAW SQL FAILED:', rawErr?.message, rawErr?.detail);
        // Fallback: usa TypeORM save con entity completa
        const item = this.itemRepo.create({
          tenantId,
          sku,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          category: dto.category?.trim() || null,
          groupId: dto.groupId || null,
          customFields: dto.customFields || null,
          isForSale: dto.isForSale === false ? false : true,
          quantity: Number(dto.quantity ?? 0),
          reservedQuantity: 0,
          reorderLevel: Number(dto.reorderLevel ?? 5),
          unitCost: dto.unitCost != null ? Number(dto.unitCost) : null,
          sellingPrice: dto.sellingPrice != null ? Number(dto.sellingPrice) : null,
        } as any);
        const saved = await this.itemRepo.save(item);
        insertResult = [{ id: saved.id }];
      }

      // eslint-disable-next-line no-console
      console.log('[ProductsService.create] RAW SQL result:', JSON.stringify(insertResult));

      // Postgres RETURNING può restituire formati diversi a seconda del driver
      let savedId: string | null = null;
      if (Array.isArray(insertResult) && insertResult.length > 0) {
        savedId = insertResult[0]?.id || insertResult[0]?.[0] || null;
      }

      // Se ancora senza ID, cerca per SKU + tenant (ultimo inserito)
      if (!savedId) {
        const found = await this.dataSource.query(
          `SELECT id FROM inventory_items WHERE tenant_id = $1 AND sku = $2 ORDER BY created_at DESC LIMIT 1`,
          [tenantId, sku],
        );
        savedId = found?.[0]?.id || null;
      }

      if (!savedId) {
        throw new Error('INSERT inventory_items non ha restituito un ID e fallback SELECT ha fallito');
      }

      // Se entry con quantity > 0, registriamo un movimento PURCHASE iniziale
      if ((dto.quantity ?? 0) > 0) {
        await this.movementRepo.save(
          this.movementRepo.create({
            tenantId,
            itemId: savedId,
            movementType: 'PURCHASE',
            quantity: dto.quantity!,
            unitCost: dto.unitCost ?? null,
            referenceType: 'INITIAL_STOCK',
            performedBy,
            notes: 'Stock iniziale alla creazione del prodotto',
          }),
        );
      }

      return this.findOne(tenantId, savedId, true);
    } catch (err: any) {
      // Logga il dettaglio COMPLETO dell'errore Postgres per identificare
      // il campo esatto che causa il 23502 (not_null_violation).
      // eslint-disable-next-line no-console
      console.error('[ProductsService.create] FAILED — FULL ERROR', {
        tenantId,
        performedBy,
        sku,
        // Tutti i campi dell'errore TypeORM/Postgres
        errorCode: err?.code,
        errorDriverCode: err?.driverError?.code,
        errorDetail: err?.detail,
        errorDriverDetail: err?.driverError?.detail,
        errorMessage: err?.message,
        errorDriverMessage: err?.driverError?.message,
        errorColumn: err?.column,
        errorRoutine: err?.routine,
        errorSchema: err?.schema,
        errorTable: err?.table,
        // Il dto completo per confronto
        dtoSent: { ...dto, sku },
      });
      // Logga il dettaglio dell'errore (sarà catturato anche dal filter,
      // ma qui aggiungiamo contesto specifico al modulo inventory).
      // eslint-disable-next-line no-console
      console.error('[ProductsService.create] FAILED', {
        tenantId,
        performedBy,
        sku,
        groupId: dto.groupId,
        code: err?.code,
        constraint: err?.constraint,
        column: err?.column,
        detail: err?.detail,
        message: err?.message,
      });
      // Rilancia: il filter globale lo tradurrà in messaggio italiano
      throw err;
    }
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
    // Phase H — fallback BLINDATO
    tenantId = await this.resolveTenantId(tenantId, performedBy);
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
    // Phase H — fallback BLINDATO
    tenantId = await this.resolveTenantId(tenantId, performedBy);
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
          // Phase D minimal — metodo di pagamento
          paymentMethod: dto.paymentMethod || null,
        }),
      );

      const product = await this.findOne(tenantId, item.id, true);

      // Sync con gare DEVICE: quando un dispositivo viene venduto,
      // aggiorna le CompetitionEntry per le gare che includono questo prodotto.
      if (this.competitionEntries && movement) {
        this.competitionEntries.syncDeviceSaleEntries(movement.id).catch((err) => {
          // eslint-disable-next-line no-console
          console.error(`[ProductsService.sell] syncDeviceSaleEntries failed:`, err);
        });
      }

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
