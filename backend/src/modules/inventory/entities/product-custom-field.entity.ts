import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ProductGroup } from './product-group.entity';

/**
 * Campo custom liberamente definibile per un gruppo di prodotti.
 * Es. per il gruppo "Telefoni" → IMEI, Colore, Memoria.
 *
 * I valori effettivi vivono in `inventory_items.custom_fields` (jsonb).
 * Questa tabella definisce solo SCHEMA/LABEL/TIPO per ogni gruppo.
 */
export type CustomFieldType = 'STRING' | 'NUMBER' | 'BOOLEAN';

@Entity('product_custom_fields')
@Index(['groupId', 'sortOrder'])
export class ProductCustomField {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'group_id' })
  groupId: string;

  @ManyToOne(() => ProductGroup, (g) => g.customFields, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: ProductGroup;

  /** chiave usata in inventory_items.custom_fields[fieldKey] */
  @Column({ name: 'field_key', length: 60 })
  fieldKey: string;

  /** label mostrata in UI */
  @Column({ name: 'field_label', length: 120 })
  fieldLabel: string;

  @Column({ name: 'field_type', type: 'varchar', length: 16, default: 'STRING' })
  fieldType: CustomFieldType;

  @Column({ name: 'is_required', default: false })
  isRequired: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'NOW()' })
  createdAt: Date;
}
