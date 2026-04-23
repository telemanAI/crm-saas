import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 1716000000001 - FixOffersCategoryEnum
 *
 * PROBLEMA: L'enum PostgreSQL offers_category_enum potrebbe non contenere
 * i valori 'MOBILE' e 'ENERGY' se il DB è stato creato prima dell'aggiornamento
 * dell'entity (offer.entity.ts ha enum: ['FIXED_LINE', 'MOBILE', 'ENERGY']).\n *
 * Questo impedisce al SUPER_ADMIN di creare offerte MOBILE/ENERGY.
 *
 * FIX: Ricrea l'enum con i 3 valori corretti, preservando i dati esistenti.
 */
export class FixOffersCategoryEnum1716000000001 implements MigrationInterface {
  name = 'FixOffersCategoryEnum1716000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Verifica se la colonna usa un enum
    const enumExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'offers_category_enum'
      );
    `);

    if (enumExists[0]?.exists) {
      // L'enum esiste - verifica quali valori ha
      const enumValues = await queryRunner.query(`
        SELECT enumlabel FROM pg_enum
        WHERE enumtypid = 'offers_category_enum'::regtype
        ORDER BY enumsortorder;
      `);
      const values = enumValues.map((v: any) => v.enumlabel);

      // Se manca MOBILE o ENERGY, ricrea l'enum
      if (!values.includes('MOBILE') || !values.includes('ENERGY')) {
        // Converte a text temporaneamente
        await queryRunner.query(`
          ALTER TABLE offers
          ALTER COLUMN category TYPE text
          USING category::text;
        `);

        // Droppa vecchio enum
        await queryRunner.query(`
          DROP TYPE IF EXISTS offers_category_enum;
        `);

        // Crea nuovo enum con tutti i valori
        await queryRunner.query(`
          CREATE TYPE offers_category_enum AS ENUM ('FIXED_LINE', 'MOBILE', 'ENERGY');
        `);

        // Riconverte a enum
        await queryRunner.query(`
          ALTER TABLE offers
          ALTER COLUMN category TYPE offers_category_enum
          USING category::offers_category_enum;
        `);

        // Ripristina default
        await queryRunner.query(`
          ALTER TABLE offers
          ALTER COLUMN category SET DEFAULT 'FIXED_LINE';
        `);
      }
    } else {
      // Nessun enum trovato - la colonna è probabilmente già text/varchar
      // Crea l'enum e converti
      await queryRunner.query(`
        CREATE TYPE offers_category_enum AS ENUM ('FIXED_LINE', 'MOBILE', 'ENERGY');
      `);

      // Se la colonna è text/varchar, convertila
      const colType = await queryRunner.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'offers' AND column_name = 'category';
      `);

      if (colType[0]?.data_type === 'text' || colType[0]?.data_type === 'character varying') {
        await queryRunner.query(`
          ALTER TABLE offers
          ALTER COLUMN category TYPE offers_category_enum
          USING category::offers_category_enum;
        `);

        await queryRunner.query(`
          ALTER TABLE offers
          ALTER COLUMN category SET DEFAULT 'FIXED_LINE';
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Down semplificato - in caso di rollback converte a text
    await queryRunner.query(`
      ALTER TABLE offers
      ALTER COLUMN category TYPE text
      USING category::text;
    `);
    await queryRunner.query(`
      DROP TYPE IF EXISTS offers_category_enum;
    `);
  }
}
