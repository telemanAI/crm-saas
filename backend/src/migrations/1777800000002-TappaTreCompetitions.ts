import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 1777800000002 — Tappa 3: Sistema Gare (Competitions)
 *
 * Crea 4 nuove tabelle:
 *  - competitions          (gara madre)
 *  - competition_targets   (target/righe)
 *  - competition_prizes    (premi a scaglioni)
 *  - competition_entries   (pezzi assegnati: ogni match pratica/vendita ↔ target)
 */
export class TappaTreCompetitions1777800000002 implements MigrationInterface {
  name = 'TappaTreCompetitions1777800000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============ competitions ============
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "competitions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "company_id" uuid NULL,
        "title" varchar(200) NOT NULL,
        "description" text NULL,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "is_auto_monthly" boolean NOT NULL DEFAULT false,
        "template_key" varchar(80) NULL,
        "created_by" uuid NULL,
        "created_at" timestamp NOT NULL DEFAULT NOW(),
        "updated_at" timestamp NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_competitions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_comp_tenant_active" ON "competitions" ("tenant_id","is_active")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_comp_tenant_start" ON "competitions" ("tenant_id","start_date")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_comp_template" ON "competitions" ("template_key")`);

    // ============ competition_targets ============
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "competition_targets" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "competition_id" uuid NOT NULL,
        "label" varchar(200) NOT NULL,
        "category" varchar(32) NOT NULL DEFAULT 'CUSTOM',
        "match_providers" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "match_offer_keywords" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "match_practice_types" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "target_pieces" int NOT NULL DEFAULT 0,
        "sort_order" int NOT NULL DEFAULT 0,
        CONSTRAINT "PK_comp_targets" PRIMARY KEY ("id"),
        CONSTRAINT "FK_comp_targets_comp" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_comp_targets_comp_sort" ON "competition_targets" ("competition_id","sort_order")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_comp_targets_comp_cat" ON "competition_targets" ("competition_id","category")`);

    // ============ competition_prizes ============
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "competition_prizes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "competition_id" uuid NOT NULL,
        "label" varchar(200) NOT NULL,
        "scope" varchar(16) NOT NULL DEFAULT 'OPERATOR',
        "kind" varchar(16) NOT NULL DEFAULT 'PIECES',
        "category" varchar(16) NOT NULL DEFAULT 'GLOBAL',
        "target_id" uuid NULL,
        "threshold" numeric(14,2) NOT NULL DEFAULT 0,
        "prize_value" numeric(14,2) NULL,
        "sort_order" int NOT NULL DEFAULT 0,
        CONSTRAINT "PK_comp_prizes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_comp_prizes_comp" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_comp_prizes_comp_scope" ON "competition_prizes" ("competition_id","scope")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_comp_prizes_comp_sort" ON "competition_prizes" ("competition_id","sort_order")`);

    // ============ competition_entries ============
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "competition_entries" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "company_id" uuid NULL,
        "competition_id" uuid NOT NULL,
        "target_id" uuid NULL,
        "user_id" uuid NOT NULL,
        "source_type" varchar(16) NOT NULL,
        "source_id" uuid NOT NULL,
        "category" varchar(16) NOT NULL,
        "provider" varchar(100) NULL,
        "offer_name" varchar(255) NULL,
        "pieces" int NOT NULL DEFAULT 1,
        "revenue" numeric(14,2) NULL,
        "created_at" timestamp NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_comp_entries" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_comp_entries_unique" UNIQUE ("competition_id","target_id","source_type","source_id","user_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_comp_entries_tenant_comp" ON "competition_entries" ("tenant_id","competition_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_comp_entries_comp_target" ON "competition_entries" ("competition_id","target_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_comp_entries_user_date" ON "competition_entries" ("user_id","created_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_comp_entries_source" ON "competition_entries" ("source_type","source_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "competition_entries"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "competition_prizes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "competition_targets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "competitions"`);
  }
}
