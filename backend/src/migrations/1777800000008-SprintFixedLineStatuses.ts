import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sprint Pratiche Rete Fissa — Stati Linea | Quick Edit | UX/Flow
 * Aggiunge:
 *  - global_status (NON_COMPLETATA/COMPLETATA) alla tabella practices
 *  - old_line_status (DA_DISATTIVARE/IN_DISATTIVAZIONE/DISATTIVATA) alla tabella practices
 *  - old_line_technology (FTTC/FTTH/FWA) alla tabella practices
 * Strategia ADDITIVA: nessun DROP, default safe.
 */
export class SprintFixedLineStatuses implements MigrationInterface {
  name = 'SprintFixedLineStatuses' + Date.now();

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) global_status enum + colonna
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "practice_global_status_enum" AS ENUM ('NON_COMPLETATA', 'COMPLETATA');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE "practices"
      ADD COLUMN IF NOT EXISTS "global_status" "practice_global_status_enum" DEFAULT 'NON_COMPLETATA'
    `);

    // 2) old_line_status enum + colonna
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "practice_old_line_status_enum" AS ENUM ('DA_DISATTIVARE', 'IN_DISATTIVAZIONE', 'DISATTIVATA');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE "practices"
      ADD COLUMN IF NOT EXISTS "old_line_status" "practice_old_line_status_enum"
    `);

    // 3) old_line_technology enum + colonna
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "practice_old_line_technology_enum" AS ENUM ('FTTC', 'FTTH', 'FWA');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE "practices"
      ADD COLUMN IF NOT EXISTS "old_line_technology" "practice_old_line_technology_enum"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "practices" DROP COLUMN IF EXISTS "old_line_technology"`);
    await queryRunner.query(`ALTER TABLE "practices" DROP COLUMN IF EXISTS "old_line_status"`);
    await queryRunner.query(`ALTER TABLE "practices" DROP COLUMN IF EXISTS "global_status"`);

    await queryRunner.query(`
      DO $$ BEGIN
        DROP TYPE IF EXISTS "practice_old_line_technology_enum";
        DROP TYPE IF EXISTS "practice_old_line_status_enum";
        DROP TYPE IF EXISTS "practice_global_status_enum";
      EXCEPTION WHEN undefined_object THEN NULL; END $$;
    `);
  }
}
