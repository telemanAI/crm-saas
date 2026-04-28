import { Entity, Column, PrimaryGeneratedColumn, OneToMany, Index } from 'typeorm';
import { ProductCustomField } from './product-custom-field.entity';

/**
 * Gruppo di prodotti del catalogo (es. "Telefoni", "Accessori", "SIM", "Modem").
 * Liberi: il founder/admin può crearne quanti vuole.
 *
 * Scope: per shop (`tenantId`).
 */
@Entity('product_groups')
@Index(['tenantId', 'sortOrder'])
export class ProductGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 120 })
  name: string;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @OneToMany(() => ProductCustomField, (f) => f.group, { cascade: true })
  customFields: ProductCustomField[];

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'NOW()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'NOW()' })
  updatedAt: Date;
}
