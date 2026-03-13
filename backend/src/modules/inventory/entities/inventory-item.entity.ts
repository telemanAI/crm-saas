import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { InventoryMovement } from './inventory-movement.entity';

@Entity('inventory_items')
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
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

  @Column({ nullable: true })
  category: string;

  @Column({ default: 0 })
  quantity: number;

  @Column({ name: 'reserved_quantity', default: 0 })
  reservedQuantity: number;

  @Column({ name: 'reorder_level', default: 10 })
  reorderLevel: number;

  @Column({ name: 'unit_cost', type: 'decimal', precision: 10, scale: 2, nullable: true })
  unitCost: number;

  @Column({ name: 'selling_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  sellingPrice: number;

  @Column({ type: 'jsonb', nullable: true })
  supplierInfo: any;

  @OneToMany(() => InventoryMovement, movement => movement.item)
  movements: InventoryMovement[];

  @Column({ name: 'created_at', default: () => 'NOW()' })
  createdAt: Date;

  @Column({ name: 'updated_at', default: () => 'NOW()' })
  updatedAt: Date;
}
