import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 1716000000003 - MakeTypeNullable
 *
 * PROBLEMA: Se la migration 1716000000000 è stata già eseguita senza
 * il DROP NOT NULL, la colonna practices.type ha ancora il constraint NOT NULL.
 * Questo causa: "null value in column type violates not-null constraint"
 * quando i wizard MOBILE/ENERGY creano pratiche senza gestore selezionato.
 *
 * FIX: Rimuove il NOT NULL constraint sulla colonna type.
 * Questa migration è idempotente (può essere eseguita più volte senza danni).
 */
export class MakeTypeNullable1716000000003 implements MigrationInterface {
  name = 'MakeTypeNullable1716000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verifica se il constraint NOT NULL è ancora attivo
    const colInfo = await queryRunner.query(`
      SELECT is_nullable
      FROM information_schema.columns
      WHERE table_name = 'practices' AND column_name = 'type';
    `);

    if (colInfo[0]?.is_nullable === 'NO') {
      await queryRunner.query(`
        ALTER TABLE practices
        ALTER COLUMN type DROP NOT NULL;
      `);
      console.log('NOT NULL constraint rimosso dalla colonna practices.type');
    } else {
      console.log('La colonna practices.type è già nullable, skip.');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE practices
      ALTER COLUMN type SET NOT NULL;
    `);
  }
}
