import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 1777800000004 — PHASE B
 *
 * Modifica al jsonb `permissions` di tutte le righe esistenti in `user_shop_memberships`:
 *  1. RIMUOVE la chiave `canManageCashRegister` (permesso obsoleto, non più usato)
 *  2. AGGIUNGE la chiave `canManageSales` (default = false per sicurezza, cambiabile dall'admin)
 *
 * Le membership esistenti sono aggiornate via `permissions - 'canManageCashRegister'`
 * (operatore JSONB - chiave) e `permissions || jsonb` per il merge.
 *
 * Il `down()` ripristina le chiavi (rollback safe).
 */
export class PhaseBPermissionsCleanup1777800000004 implements MigrationInterface {
  name = 'PhaseBPermissionsCleanup1777800000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rimuove la chiave canManageCashRegister da tutte le membership esistenti
    await queryRunner.query(`
      UPDATE "user_shop_memberships"
      SET "permissions" = "permissions" - 'canManageCashRegister'
      WHERE "permissions" ? 'canManageCashRegister'
    `);

    // Aggiunge canManageSales con default coerente per ruolo:
    //   FOUNDER + ADMIN  → true
    //   OPERATOR         → false
    // Solo se la chiave non esiste già (evita override di valori già impostati dall'admin)
    await queryRunner.query(`
      UPDATE "user_shop_memberships"
      SET "permissions" = "permissions" || jsonb_build_object('canManageSales', true)
      WHERE NOT ("permissions" ? 'canManageSales')
        AND "role" IN ('FOUNDER', 'ADMIN')
    `);
    await queryRunner.query(`
      UPDATE "user_shop_memberships"
      SET "permissions" = "permissions" || jsonb_build_object('canManageSales', false)
      WHERE NOT ("permissions" ? 'canManageSales')
        AND "role" = 'OPERATOR'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rimuove canManageSales (rollback)
    await queryRunner.query(`
      UPDATE "user_shop_memberships"
      SET "permissions" = "permissions" - 'canManageSales'
      WHERE "permissions" ? 'canManageSales'
    `);

    // Ripristina canManageCashRegister con default true per FOUNDER/ADMIN, true OPERATOR
    // (riproduce i default precedenti)
    await queryRunner.query(`
      UPDATE "user_shop_memberships"
      SET "permissions" = "permissions" || jsonb_build_object('canManageCashRegister', true)
      WHERE NOT ("permissions" ? 'canManageCashRegister')
    `);
  }
}
