import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 1777800000006 — PHASE D minimal
 *
 * Aggiunge la colonna `payment_method` (varchar 32 nullable) a inventory_movements.
 * Permette di registrare il metodo di pagamento di una vendita
 * (CASH / CARD / BANK_TRANSFER / POS / FINANCING / OTHER).
 *
 * I dettagli completi del finanziamento (provider, rate, ecc.) verranno
 * aggiunti in una fase successiva (Phase D full). Questa migration è
 * minimale e idempotente.
 */
export class PhaseDMinimalPaymentMethod1777800000006 implements MigrationInterface {
  name = 'PhaseDMinimalPaymentMethod1777800000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('inventory_movements', 'payment_method');
    if (!hasColumn) {
      await queryRunner.query(
        `ALTER TABLE "inventory_movements" ADD COLUMN "payment_method" varchar(32)`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('inventory_movements', 'payment_method');
    if (hasColumn) {
      await queryRunner.query(`ALTER TABLE "inventory_movements" DROP COLUMN "payment_method"`);
    }
  }
}
