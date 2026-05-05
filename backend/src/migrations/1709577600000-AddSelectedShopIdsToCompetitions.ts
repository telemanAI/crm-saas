import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tappa 3.2 — Aggiunta colonna `selected_shop_ids` su `competitions`.
 *
 * Permette al founder di creare gare scope=company che includano SOLO un
 * sottoinsieme dei negozi della company (es. company con 10 negozi → 2 gare
 * separate da 5 negozi ciascuna).
 *
 * NULL = tutti gli shop della company (default legacy, retro-compatibile).
 *
 * Migration idempotente (CHECK COLUMN EXISTS prima di ADD) per evitare
 * crash se la colonna è stata già aggiunta a mano in produzione.
 */
export class AddSelectedShopIdsToCompetitions1709577600000 implements MigrationInterface {
  name = 'AddSelectedShopIdsToCompetitions1709577600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'competitions' AND column_name = 'selected_shop_ids'
    `);
    if (!exists || exists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "competitions"
        ADD COLUMN "selected_shop_ids" uuid[] NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "competitions" DROP COLUMN IF EXISTS "selected_shop_ids"
    `);
  }
}
