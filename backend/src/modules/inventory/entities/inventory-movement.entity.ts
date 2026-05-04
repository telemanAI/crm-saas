import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { InventoryItem } from './inventory-item.entity';
import { User } from '../../users/entities/user.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Practice } from '../../practices/entities/practice.entity';

/**
 * movementType valori standard:
 *  - 'PURCHASE'  → ricezione fornitore / restock (quantità +)
 *  - 'SALE'      → vendita al cliente (quantità -)
 *  - 'ADJUST_IN' → rettifica positiva (inventario, reso, ecc.)
 *  - 'ADJUST_OUT'→ rettifica negativa (rotture, smarrimenti)
 *  - 'TRANSFER'  → spostamento tra shop (futuro)
 */
export type MovementType = 'PURCHASE' | 'SALE' | 'ADJUST_IN' | 'ADJUST_OUT' | 'TRANSFER';

@Entity('inventory_movements')
@Index(['tenantId', 'movementType', 'createdAt'])
@Index(['tenantId', 'soldByUserId'])
@Index(['customerId'])
@Index(['practiceId'])
export class InventoryMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'item_id' })
  itemId: string;

  @ManyToOne(() => InventoryItem, (item) => item.movements)
  @JoinColumn({ name: 'item_id' })
  item: InventoryItem;

  @Column({ name: 'movement_type', type: 'varchar', length: 24 })
  movementType: MovementType | string;

  @Column()
  quantity: number;

  @Column({ name: 'unit_cost', type: 'decimal', precision: 10, scale: 2, nullable: true })
  unitCost: number | null;

  // ===== NUOVO (Tappa 1): prezzo di vendita applicato in questo movimento =====
  @Column({ name: 'unit_sale_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  unitSalePrice: number | null;

  @Column({ name: 'reference_type', nullable: true })
  referenceType: string;

  @Column({ name: 'reference_id', nullable: true })
  referenceId: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Chi ha materialmente registrato il movimento
  @Column({ name: 'performed_by' })
  performedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'performed_by' })
  performer: User;

  // ===== NUOVO (Tappa 1): venditore (per movementType='SALE') =====
  // In genere coincide con performedBy, ma teniamo separato per casi futuri
  // (es. registrazione fatta da admin per conto di un operatore).
  @Column({ name: 'sold_by_user_id', type: 'uuid', nullable: true })
  soldByUserId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'sold_by_user_id' })
  soldByUser: User | null;

  // ===== NUOVO (Tappa 1): collegamento opzionale a cliente =====
  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId: string | null;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer | null;

  // ===== NUOVO (Tappa 1): collegamento opzionale a pratica =====
  @Column({ name: 'practice_id', type: 'uuid', nullable: true })
  practiceId: string | null;

  @ManyToOne(() => Practice, { nullable: true })
  @JoinColumn({ name: 'practice_id' })
  practice: Practice | null;

  // ===== Phase D minimal: metodo di pagamento =====
  // Valori liberi (es. 'CASH', 'CARD', 'BANK_TRANSFER', 'POS', 'FINANCING', ecc.)
  // I dettagli completi del finanziamento (provider, rate, ecc.) verranno
  // aggiunti in una fase successiva se servirà — qui registriamo solo
  // l'indicazione operativa per la chiusura cassa.
  @Column({ name: 'payment_method', type: 'varchar', length: 32, nullable: true })
  paymentMethod: string | null;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'NOW()' })
  createdAt: Date;
}
