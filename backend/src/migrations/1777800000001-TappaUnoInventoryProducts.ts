import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 1777800000001 — Tappa 1: Inventory / Catalogo Prodotti & Vendite
 *
 * Cosa fa:
 *  1. Crea tabella `product_groups` (gruppi liberi: Telefoni, Accessori, ...)
 *  2. Crea tabella `product_custom_fields` (schema dei campi custom per gruppo)
 *  3. Estende `inventory_items` con: group_id, custom_fields (jsonb), is_for_sale
 *  4. Estende `inventory_movements` con: unit_sale_price, sold_by_user_id, customer_id, practice_id
 *
 * Idempotente: usa IF NOT EXISTS, non rompe i dati esistenti.
 */
export class TappaUnoInventoryProducts1777800000001 implements MigrationInterface {
  name = 'TappaUnoInventoryProducts1777800000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============ 1) product_groups ============
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_groups" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "name" varchar(120) NOT NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamp NOT NULL DEFAULT NOW(),
        "updated_at" timestamp NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_product_groups" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_product_groups_tenant_sort"
        ON "product_groups" ("tenant_id", "sort_order")
    `);

    // ============ 2) product_custom_fields ============
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_custom_fields" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "group_id" uuid NOT NULL,
        "field_key" varchar(60) NOT NULL,
        "field_label" varchar(120) NOT NULL,
        "field_type" varchar(16) NOT NULL DEFAULT 'STRING',
        "is_required" boolean NOT NULL DEFAULT false,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamp NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_product_custom_fields" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pcf_group" FOREIGN KEY ("group_id") REFERENCES "product_groups"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pcf_group_sort"
        ON "product_custom_fields" ("group_id", "sort_order")
    `);

    // ============ 3) inventory_items: nuovi campi ============
    const colsItems = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'inventory_items'
    `);
    const colNamesItems = new Set(colsItems.map((c: any) => c.column_name));

    if (!colNamesItems.has('group_id')) {
      await queryRunner.query(`ALTER TABLE "inventory_items" ADD COLUMN "group_id" uuid NULL`);
      await queryRunner.query(`
        ALTER TABLE "inventory_items"
          ADD CONSTRAINT "FK_inv_items_group"
          FOREIGN KEY ("group_id") REFERENCES "product_groups"("id") ON DELETE SET NULL
      `);
    }
    if (!colNamesItems.has('custom_fields')) {
      await queryRunner.query(`ALTER TABLE "inventory_items" ADD COLUMN "custom_fields" jsonb NULL`);
    }
    if (!colNamesItems.has('is_for_sale')) {
      await queryRunner.query(
        `ALTER TABLE "inventory_items" ADD COLUMN "is_for_sale" boolean NOT NULL DEFAULT true`,
      );
    }
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_inv_items_tenant_isforsale"
        ON "inventory_items" ("tenant_id", "is_for_sale")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_inv_items_tenant_group"
        ON "inventory_items" ("tenant_id", "group_id")
    `);

    // ============ 4) inventory_movements: nuovi campi ============
    const colsMov = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'inventory_movements'
    `);
    const colNamesMov = new Set(colsMov.map((c: any) => c.column_name));

    if (!colNamesMov.has('unit_sale_price')) {
      await queryRunner.query(
        `ALTER TABLE "inventory_movements" ADD COLUMN "unit_sale_price" decimal(10,2) NULL`,
      );
    }
    if (!colNamesMov.has('sold_by_user_id')) {
      await queryRunner.query(`ALTER TABLE "inventory_movements" ADD COLUMN "sold_by_user_id" uuid NULL`);
    }
    if (!colNamesMov.has('customer_id')) {
      await queryRunner.query(`ALTER TABLE "inventory_movements" ADD COLUMN "customer_id" uuid NULL`);
    }
    if (!colNamesMov.has('practice_id')) {
      await queryRunner.query(`ALTER TABLE "inventory_movements" ADD COLUMN "practice_id" uuid NULL`);
    }
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_inv_mov_tenant_type_date"
        ON "inventory_movements" ("tenant_id", "movement_type", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_inv_mov_tenant_seller"
        ON "inventory_movements" ("tenant_id", "sold_by_user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_inv_mov_customer"
        ON "inventory_movements" ("customer_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_inv_mov_practice"
        ON "inventory_movements" ("practice_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ============ Rollback inventory_movements ============
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_inv_mov_practice"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_inv_mov_customer"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_inv_mov_tenant_seller"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_inv_mov_tenant_type_date"`);
    await queryRunner.query(`ALTER TABLE "inventory_movements" DROP COLUMN IF EXISTS "practice_id"`);
    await queryRunner.query(`ALTER TABLE "inventory_movements" DROP COLUMN IF EXISTS "customer_id"`);
    await queryRunner.query(`ALTER TABLE "inventory_movements" DROP COLUMN IF EXISTS "sold_by_user_id"`);
    await queryRunner.query(`ALTER TABLE "inventory_movements" DROP COLUMN IF EXISTS "unit_sale_price"`);

    // ============ Rollback inventory_items ============
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_inv_items_tenant_group"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_inv_items_tenant_isforsale"`);
    await queryRunner.query(
      `ALTER TABLE "inventory_items" DROP CONSTRAINT IF EXISTS "FK_inv_items_group"`,
    );
    await queryRunner.query(`ALTER TABLE "inventory_items" DROP COLUMN IF EXISTS "is_for_sale"`);
    await queryRunner.query(`ALTER TABLE "inventory_items" DROP COLUMN IF EXISTS "custom_fields"`);
    await queryRunner.query(`ALTER TABLE "inventory_items" DROP COLUMN IF EXISTS "group_id"`);

    // ============ Drop tabelle nuove ============
    await queryRunner.query(`DROP TABLE IF EXISTS "product_custom_fields"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_groups"`);
  }
}
