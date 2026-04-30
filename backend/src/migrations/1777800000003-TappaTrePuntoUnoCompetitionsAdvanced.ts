import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 1777800000003 — TAPPA 3.1 — Gare avanzate, scope company/shop,
 * target a 3 livelli (category_generic / provider_generic / specific),
 * collegamento offerId su practices, isHidden, retroattività.
 *
 * Idempotente: tutti i comandi usano IF NOT EXISTS / IF EXISTS dove possibile.
 *
 * NB: NON crea tabella `inventory_sales` (Tappa 3.2). Le colonne
 * `inventory_item_ids` su targets sono già pronte come array JSONB.
 */
export class TappaTrePuntoUnoCompetitionsAdvanced1777800000003
  implements MigrationInterface {
  name = 'TappaTrePuntoUnoCompetitionsAdvanced1777800000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================
    // 1. practices.offer_id (FK opzionale a offers.id) + index
    // ============================================================
    await queryRunner.query(`
      ALTER TABLE "practices"
      ADD COLUMN IF NOT EXISTS "offer_id" uuid NULL
    `);
    // FK soft (NULL se offerta cancellata)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_practices_offer'
        ) THEN
          ALTER TABLE "practices"
          ADD CONSTRAINT "FK_practices_offer"
          FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE SET NULL;
        END IF;
      END$$;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_practices_offer_id" ON "practices" ("offer_id")
    `);
    // Index per query retroattive: scope+periodo+attive+non importate
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_practices_recompute"
      ON "practices" ("tenant_id", "operational_status", "source_import_job_id", "created_at")
    `);

    // ============================================================
    // 2. Popolamento retroattivo practices.offer_id
    //    Match sicuro: stesso (provider, name, canone) → 1 unico match
    //    Dove ambiguo (multipli o zero match) → resta NULL.
    // ============================================================
    await queryRunner.query(`
      UPDATE "practices" p
      SET "offer_id" = sub.offer_id
      FROM (
        SELECT
          pr.id AS practice_id,
          o.id AS offer_id
        FROM "practices" pr
        JOIN "offers" o
          ON UPPER(o.provider) = UPPER(COALESCE(pr.offer_type, pr.type))
         AND UPPER(o.name) = UPPER(pr.offer_name)
         AND COALESCE(o.canone, '') = COALESCE(pr.offer_canone, '')
        WHERE pr.offer_name IS NOT NULL
          AND pr.offer_id IS NULL
        GROUP BY pr.id, o.id
        HAVING COUNT(*) = 1
      ) sub
      WHERE p.id = sub.practice_id
    `);

    // ============================================================
    // 3. competitions: scope_type + is_hidden
    // ============================================================
    await queryRunner.query(`
      ALTER TABLE "competitions"
      ADD COLUMN IF NOT EXISTS "scope_type" varchar(16) NOT NULL DEFAULT 'shop'
    `);
    await queryRunner.query(`
      ALTER TABLE "competitions"
      ADD COLUMN IF NOT EXISTS "is_hidden" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_comp_scope_company"
      ON "competitions" ("company_id", "scope_type")
    `);

    // ============================================================
    // 4. competition_targets: target_type + provider + offer_ids + inventory_item_ids
    // ============================================================
    await queryRunner.query(`
      ALTER TABLE "competition_targets"
      ADD COLUMN IF NOT EXISTS "target_type" varchar(24) NOT NULL DEFAULT 'specific'
    `);
    await queryRunner.query(`
      ALTER TABLE "competition_targets"
      ADD COLUMN IF NOT EXISTS "provider" varchar(50) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "competition_targets"
      ADD COLUMN IF NOT EXISTS "offer_ids" jsonb NOT NULL DEFAULT '[]'::jsonb
    `);
    await queryRunner.query(`
      ALTER TABLE "competition_targets"
      ADD COLUMN IF NOT EXISTS "inventory_item_ids" jsonb NOT NULL DEFAULT '[]'::jsonb
    `);

    // I target esistenti (Tappa 3 originale) con matchProviders/matchKeywords
    // sono ancora supportati come fallback "specific" basato su keyword.
    // Per i nuovi target useremo target_type = 'category_generic' o 'provider_generic'.

    // ============================================================
    // 5. competition_entries: aggiungi colonna shop_id (per query report)
    // ============================================================
    await queryRunner.query(`
      ALTER TABLE "competition_entries"
      ADD COLUMN IF NOT EXISTS "shop_id" uuid NULL
    `);
    // Popola shop_id dalle entries esistenti (= tenant_id ai tempi della Tappa 3)
    await queryRunner.query(`
      UPDATE "competition_entries" SET "shop_id" = "tenant_id" WHERE "shop_id" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_comp_entries_shop_user_date"
      ON "competition_entries" ("shop_id", "user_id", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_comp_entries_shop_user_date"`);
    await queryRunner.query(`ALTER TABLE "competition_entries" DROP COLUMN IF EXISTS "shop_id"`);
    await queryRunner.query(`ALTER TABLE "competition_targets" DROP COLUMN IF EXISTS "inventory_item_ids"`);
    await queryRunner.query(`ALTER TABLE "competition_targets" DROP COLUMN IF EXISTS "offer_ids"`);
    await queryRunner.query(`ALTER TABLE "competition_targets" DROP COLUMN IF EXISTS "provider"`);
    await queryRunner.query(`ALTER TABLE "competition_targets" DROP COLUMN IF EXISTS "target_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_comp_scope_company"`);
    await queryRunner.query(`ALTER TABLE "competitions" DROP COLUMN IF EXISTS "is_hidden"`);
    await queryRunner.query(`ALTER TABLE "competitions" DROP COLUMN IF EXISTS "scope_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_practices_recompute"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_practices_offer_id"`);
    await queryRunner.query(`
      DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='FK_practices_offer')
      THEN ALTER TABLE "practices" DROP CONSTRAINT "FK_practices_offer"; END IF; END$$;
    `);
    await queryRunner.query(`ALTER TABLE "practices" DROP COLUMN IF EXISTS "offer_id"`);
  }
}
