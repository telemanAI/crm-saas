import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { InventoryMovement } from './entities/inventory-movement.entity';

export interface SaleListFilters {
  from?: Date;
  to?: Date;
  soldByUserId?: string;
  customerId?: string;
  practiceId?: string;
  itemId?: string;
}

export interface SaleSummary {
  totalSales: number;
  totalRevenue: number;
  totalCost: number;
  totalMargin: number;
  totalUnits: number;
}

@Injectable()
export class InventorySalesService {
  constructor(
    @InjectRepository(InventoryMovement)
    private readonly movementRepo: Repository<InventoryMovement>,
  ) {}

  /**
   * Storico vendite. Se `restrictToUserId` è valorizzato, filtra solo le vendite
   * di quell'utente (usato quando l'operator NON ha `canViewAllDeviceSales`).
   */
  async listSales(
    tenantId: string,
    filters: SaleListFilters,
    restrictToUserId?: string | null,
  ) {
    const qb = this.movementRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.item', 'item')
      .leftJoinAndSelect('m.customer', 'customer')
      .leftJoinAndSelect('m.practice', 'practice')
      .leftJoinAndSelect('m.soldByUser', 'soldByUser')
      .where('m.tenantId = :tenantId', { tenantId })
      .andWhere(`m.movementType = 'SALE'`);

    if (restrictToUserId) {
      qb.andWhere('m.soldByUserId = :sbid', { sbid: restrictToUserId });
    }

    if (filters.from && filters.to) {
      qb.andWhere('m.createdAt BETWEEN :from AND :to', { from: filters.from, to: filters.to });
    } else if (filters.from) {
      qb.andWhere('m.createdAt >= :from', { from: filters.from });
    } else if (filters.to) {
      qb.andWhere('m.createdAt <= :to', { to: filters.to });
    }
    if (filters.soldByUserId) qb.andWhere('m.soldByUserId = :sb', { sb: filters.soldByUserId });
    if (filters.customerId) qb.andWhere('m.customerId = :ci', { ci: filters.customerId });
    if (filters.practiceId) qb.andWhere('m.practiceId = :pi', { pi: filters.practiceId });
    if (filters.itemId) qb.andWhere('m.itemId = :ii', { ii: filters.itemId });

    qb.orderBy('m.createdAt', 'DESC');

    const movements = await qb.getMany();

    return movements.map((m) => ({
      id: m.id,
      createdAt: m.createdAt,
      itemId: m.itemId,
      itemName: m.item?.name,
      itemSku: m.item?.sku,
      quantity: m.quantity,
      unitSalePrice: m.unitSalePrice ? Number(m.unitSalePrice) : null,
      total: m.unitSalePrice ? Number(m.unitSalePrice) * m.quantity : null,
      customerId: m.customerId,
      customerName: m.customer
        ? `${m.customer.firstName ?? ''} ${m.customer.lastName ?? ''}`.trim() || null
        : null,
      practiceId: m.practiceId,
      practiceCode: m.practice?.offerCode ?? null,
      soldByUserId: m.soldByUserId,
      soldByName: m.soldByUser
        ? `${m.soldByUser.firstName ?? ''} ${m.soldByUser.lastName ?? ''}`.trim()
        : null,
      notes: m.notes,
      // Phase D minimal — metodo di pagamento esposto in lista
      paymentMethod: m.paymentMethod ?? null,
    }));
  }

  /**
   * Statistiche aggregate vendite. Visibilità prezzi/margini gestita da `includeMargins`.
   */
  async summary(
    tenantId: string,
    filters: SaleListFilters,
    includeMargins: boolean,
    restrictToUserId?: string | null,
  ): Promise<SaleSummary> {
    const qb = this.movementRepo
      .createQueryBuilder('m')
      .where('m.tenantId = :tenantId', { tenantId })
      .andWhere(`m.movementType = 'SALE'`);

    if (restrictToUserId) qb.andWhere('m.soldByUserId = :sbid', { sbid: restrictToUserId });
    if (filters.from && filters.to) {
      qb.andWhere('m.createdAt BETWEEN :from AND :to', { from: filters.from, to: filters.to });
    }
    if (filters.soldByUserId) qb.andWhere('m.soldByUserId = :sb', { sb: filters.soldByUserId });

    const rows = await qb.getMany();
    const totalSales = rows.length;
    const totalUnits = rows.reduce((s, m) => s + Number(m.quantity), 0);
    const totalRevenue = rows.reduce(
      (s, m) => s + (m.unitSalePrice ? Number(m.unitSalePrice) * m.quantity : 0),
      0,
    );
    const totalCost = includeMargins
      ? rows.reduce((s, m) => s + (m.unitCost ? Number(m.unitCost) * m.quantity : 0), 0)
      : 0;
    const totalMargin = includeMargins ? totalRevenue - totalCost : 0;

    return {
      totalSales,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCost: includeMargins ? Math.round(totalCost * 100) / 100 : 0,
      totalMargin: includeMargins ? Math.round(totalMargin * 100) / 100 : 0,
      totalUnits,
    };
  }
}
