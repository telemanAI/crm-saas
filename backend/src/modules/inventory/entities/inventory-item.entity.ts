import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { InventoryMovement } from './inventory-movement.entity';
import { ProductGroup } from './product-group.entity';

@Entity('inventory_items')
@Index(['tenantId', 'isForSale'])
@Index(['tenantId', 'groupId'])
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column()
  sku: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  // legacy free-text category (mantenuto per backward compat)
  @Column({ nullable: true })
  category: string;

  // ===== NUOVO (Tappa 1): raggruppamento =====
  @Column({ name: 'group_id', type: 'uuid', nullable: true })
  groupId: string | null;

  @ManyToOne(() => ProductGroup, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'group_id' })
  group: ProductGroup | null;

  // ===== NUOVO (Tappa 1): valori dei campi custom del gruppo =====
  // es. { imei: '356938035643809', colore: 'Rosso', memoria: '256GB' }
  @Column({ name: 'custom_fields', type: 'jsonb', nullable: true })
  customFields: Record<string, any> | null;

  // ===== NUOVO (Tappa 1): mostra nel catalogo vendite =====
  // false = solo materiale interno (es. moduli SIM tecnici), non in vetrina vendite
  @Column({ name: 'is_for_sale', default: true })
  isForSale: boolean;

  @Column({ default: 0 })
  quantity: number;

  @Column({ name: 'reserved_quantity', default: 0 })
  reservedQuantity: number;

  @Column({ name: 'reorder_level', default: 10 })
  reorderLevel: number;

  // Prezzo di acquisto (visibile solo a chi ha canManageProducts)
  @Column({ name: 'unit_cost', type: 'decimal', precision: 10, scale: 2, nullable: true })
  unitCost: number | null;

  // Prezzo di vendita
  @Column({ name: 'selling_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  sellingPrice: number | null;

  @Column({ type: 'jsonb', nullable: true })
  supplierInfo: any;

  @OneToMany(() => InventoryMovement, (movement) => movement.item)
  movements: InventoryMovement[];

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'NOW()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'NOW()' })
  updatedAt: Date;
}
