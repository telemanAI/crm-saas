import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 1777800000000 — TappaZero: Permessi + Multi-shop + Last Active Shop
 *
 * Cosa fa:
 *  1. Aggiunge colonna `last_active_shop_id` su `users` (UUID nullable) per
 *     persistere lo shop attivo tra le sessioni (fix anomalia M1).
 *  2. Sostituisce il vecchio unique index `(legal_name, vat_number)` di
 *     `companies` con uno UNIQUE PARTIAL su `vat_number` (escludendo NULL).
 *     Fix anomalia M3: in Postgres NULL ≠ NULL, quindi l'unique vecchio NON
 *     bloccava le ragioni sociali "gemelle" senza P.IVA.
 *  3. NON aggiorna i permessi nei record esistenti: il self-healing soft del
 *     MembershipsService li popola al primo accesso senza sovrascrivere
 *     eventuali permessi già personalizzati dal founder.
 *
 * Idempotente, sicura, reversibile.
 */
export class TappaZeroPermessiAndMultiShop1777800000000 implements MigrationInterface {
  name = 'TappaZeroPermessiAndMultiShop1777800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===== 1) users.last_active_shop_id =====
    const hasCol = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = 'users' AND column_name = 'last_active_shop_id'`,
    );
    if (hasCol.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD COLUMN "last_active_shop_id" uuid NULL`,
      );
    }

    // ===== 2) companies: nuovo unique partial su vat_number =====
    // Drop dell'eventuale vecchio composto (legal_name, vat_number) se esiste.
    // Il nome dell'index è auto-generato da TypeORM, quindi cerco per definizione.
    const oldIndexes = await queryRunner.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'companies'
        AND indexdef ILIKE '%legal_name%'
        AND indexdef ILIKE '%vat_number%'
        AND indexdef ILIKE '%UNIQUE%'
    `);
    for (const row of oldIndexes) {
      await queryRunner.query(`DROP INDEX IF EXISTS "${row.indexname}"`);
    }

    // Crea il nuovo unique partial (NULL value escluso)
    const hasNewIdx = await queryRunner.query(`
      SELECT 1 FROM pg_indexes
      WHERE tablename = 'companies'
        AND indexname = 'idx_companies_vatnumber_unique_partial'
    `);
    if (hasNewIdx.length === 0) {
      await queryRunner.query(`
        CREATE UNIQUE INDEX "idx_companies_vatnumber_unique_partial"
        ON "companies" ("vat_number")
        WHERE "vat_number" IS NOT NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ===== Rollback unique index =====
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_companies_vatnumber_unique_partial"`,
    );
    // (non ricreo il vecchio indice: era buggato)

    // ===== Rollback colonna users =====
    const hasCol = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = 'users' AND column_name = 'last_active_shop_id'`,
    );
    if (hasCol.length > 0) {
      await queryRunner.query(
        `ALTER TABLE "users" DROP COLUMN "last_active_shop_id"`,
      );
    }
  }
}
