import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sprint Pratiche Rete Fissa — Backfill retroattivo `global_status`.
 *
 * Imposta `global_status = 'COMPLETATA'` per tutte le pratiche già presenti
 * a DB che soddisfano i vincoli business:
 *  - FIXED_LINE Nuova attivazione → operational_status = 'ACTIVATED'
 *  - FIXED_LINE Migrazione        → operational_status = 'ACTIVATED' AND old_line_status = 'DISATTIVATA'
 *  - MOBILE / ENERGY              → operational_status = 'ACTIVATED'
 *
 * Idempotente: l'UPDATE filtra le pratiche con global_status = 'NON_COMPLETATA',
 * quindi può essere rieseguito senza effetti collaterali.
 *
 * Da eseguire SEMPRE dopo la migration 1777800000008-SprintFixedLineStatuses.
 */
export class BackfillGlobalStatus1777800000009 implements MigrationInterface {
  name = 'BackfillGlobalStatus' + Date.now();

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Sicurezza: se la colonna non esiste ancora, niente da fare
    const colExists = await queryRunner.query(`
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'practices'
        AND column_name = 'global_status'
      LIMIT 1
    `);
    if (!colExists || colExists.length === 0) {
      return;
    }

    // 1) FIXED_LINE — Nuova attivazione (lineType NULL o diverso da MIGRAZIONE) attivata
    await queryRunner.query(`
      UPDATE "practices"
      SET "global_status" = 'COMPLETATA'
      WHERE "global_status" = 'NON_COMPLETATA'
        AND ("category" = 'FIXED_LINE' OR "category" IS NULL)
        AND ("line_type" IS NULL OR "line_type" <> 'MIGRAZIONE')
        AND "operational_status" = 'ACTIVATED'
    `);

    // 2) FIXED_LINE — Migrazione con vecchia linea disattivata
    await queryRunner.query(`
      UPDATE "practices"
      SET "global_status" = 'COMPLETATA'
      WHERE "global_status" = 'NON_COMPLETATA'
        AND ("category" = 'FIXED_LINE' OR "category" IS NULL)
        AND "line_type" = 'MIGRAZIONE'
        AND "operational_status" = 'ACTIVATED'
        AND "old_line_status" = 'DISATTIVATA'
    `);

    // 3) MOBILE / ENERGY — attivata (no concetto di vecchia linea fisica)
    await queryRunner.query(`
      UPDATE "practices"
      SET "global_status" = 'COMPLETATA'
      WHERE "global_status" = 'NON_COMPLETATA'
        AND "category" IN ('MOBILE', 'ENERGY')
        AND "operational_status" = 'ACTIVATED'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Roll-back conservativo: riporta tutte le pratiche aggiornate dal
    // backfill a NON_COMPLETATA. Sicuro perché la colonna ha default
    // 'NON_COMPLETATA' e nessuna logica applicativa dipende dal vecchio
    // valore (è puramente derivato dai vincoli business).
    await queryRunner.query(`
      UPDATE "practices"
      SET "global_status" = 'NON_COMPLETATA'
      WHERE "global_status" = 'COMPLETATA'
    `);
  }
}
