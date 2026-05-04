import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 1777800000005 — PHASE C(b)
 *
 * BACKFILL RETROATTIVO `practices.offer_id`.
 *
 * Le pratiche storiche hanno `offer_id = NULL` ma `offer_name` valorizzato.
 * Senza `offer_id` le gare con target `specific` non le riconoscono.
 *
 * FIX: rimosso filtro `o.tenant_id` perché la colonna non esiste in `offers`.
 * Il match avviene solo per nome (case-insensitive + trim).
 */
export class PhaseCbBackfillPracticeOfferIds1777800000005 implements MigrationInterface {
  name = 'PhaseCbBackfillPracticeOfferIds1777800000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Crea tabella temporanea di tracking per il rollback
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "_phase_cb_backfill_offer_id_changes" (
        "practice_id" uuid PRIMARY KEY,
        "applied_at" timestamp with time zone DEFAULT NOW()
      )
    `);

    const before = await queryRunner.query(
      `SELECT COUNT(*) as cnt FROM practices WHERE offer_id IS NULL AND offer_name IS NOT NULL AND TRIM(offer_name) <> ''`,
    );
    const beforeCount = parseInt(before[0]?.cnt ?? '0', 10);
    // eslint-disable-next-line no-console
    console.log(`[PhaseCbBackfill] Pratiche da analizzare (offer_id NULL + offer_name valorizzato): ${beforeCount}`);

    // FIX: rimosso il blocco AND (o.tenant_id IS NULL OR o.tenant_id = p.tenant_id)
    // perché offers non ha la colonna tenant_id nel DB.
    await queryRunner.query(`
      WITH candidates AS (
        SELECT DISTINCT ON (p.id)
          p.id AS practice_id,
          o.id AS offer_id
        FROM practices p
        JOIN offers o
          ON UPPER(TRIM(o.name)) = UPPER(TRIM(p.offer_name))
        WHERE p.offer_id IS NULL
          AND p.offer_name IS NOT NULL
          AND TRIM(p.offer_name) <> ''
        ORDER BY p.id, o.is_active DESC NULLS LAST, o.created_at DESC NULLS LAST
      ),
      tracked AS (
        INSERT INTO "_phase_cb_backfill_offer_id_changes" (practice_id)
        SELECT practice_id FROM candidates
        ON CONFLICT (practice_id) DO NOTHING
        RETURNING practice_id
      )
      UPDATE practices p
      SET offer_id = c.offer_id
      FROM candidates c
      WHERE p.id = c.practice_id
        AND p.offer_id IS NULL
    `);

    const after = await queryRunner.query(
      `SELECT COUNT(*) as cnt FROM "_phase_cb_backfill_offer_id_changes"`,
    );
    const afterCount = parseInt(after[0]?.cnt ?? '0', 10);
    const stillNull = await queryRunner.query(
      `SELECT COUNT(*) as cnt FROM practices WHERE offer_id IS NULL AND offer_name IS NOT NULL AND TRIM(offer_name) <> ''`,
    );
    const stillNullCount = parseInt(stillNull[0]?.cnt ?? '0', 10);

    // eslint-disable-next-line no-console
    console.log(
      `[PhaseCbBackfill] Pratiche aggiornate: ${afterCount}, ancora senza match: ${stillNullCount}`,
    );

    // 3. Identifica pratiche ACTIVATED senza venditore
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "_phase_cb_practices_no_seller" (
        "practice_id" uuid PRIMARY KEY,
        "tenant_id" uuid,
        "offer_name" varchar,
        "category" varchar,
        "created_at" timestamp,
        "logged_at" timestamp with time zone DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      INSERT INTO "_phase_cb_practices_no_seller"
        (practice_id, tenant_id, offer_name, category, created_at)
      SELECT id, tenant_id, offer_name, category, created_at
      FROM practices
      WHERE operational_status = 'ACTIVATED' AND sold_by_id IS NULL
      ON CONFLICT (practice_id) DO NOTHING
    `);
    const noSeller = await queryRunner.query(
      `SELECT COUNT(*) as cnt FROM "_phase_cb_practices_no_seller"`,
    );
    // eslint-disable-next-line no-console
    console.log(
      `[PhaseCbBackfill] Pratiche ACTIVATED senza venditore (da assegnare manualmente): ${parseInt(noSeller[0]?.cnt ?? '0', 10)}`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE practices p
      SET offer_id = NULL
      FROM "_phase_cb_backfill_offer_id_changes" c
      WHERE p.id = c.practice_id
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "_phase_cb_backfill_offer_id_changes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "_phase_cb_practices_no_seller"`);
  }
}