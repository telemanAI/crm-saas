import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 1716000000000 - FixPracticesTypeColumn
 *
 * PROBLEMA: La colonna practices.type era un enum PostgreSQL (practices_type_enum)
 * con valori ristretti: TIM_FIBRA, VODAFONE, WINDTRE, ILIAD, OPTIMA, IREN, SKY.
 * I wizard MOBILE ed ENERGY inviano valori diversi ('MOBILE', 'ENERGY', provider vari)
 * causando: "invalid input value for enum practices_type_enum".
 *
 * FIX: Converte la colonna da enum a varchar(50), allineandola al codice attuale
 * (practice.entity.ts definisce già type come varchar nullable).
 */
export class FixPracticesTypeColumn1716000000000 implements MigrationInterface {
  name = 'FixPracticesTypeColumn1716000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Salva i valori attuali (backup implicito via transaction)
    // 2. Converte da enum a varchar(50) - accetta qualsiasi stringa
    await queryRunner.query(`
      ALTER TABLE practices
      ALTER COLUMN type TYPE varchar(50)
      USING type::text;
    `);

    // 3. Pulisce l'enum obsoleto (se esiste)
    await queryRunner.query(`
      DROP TYPE IF EXISTS practices_type_enum;
    `);

    // 4. Aggiunge commento per documentazione
    await queryRunner.query(`
      COMMENT ON COLUMN practices.type IS 'Per FIXED_LINE: gestore (TIM_FIBRA, VODAFONE...). Per MOBILE/ENERGY: provider selezionato nel wizard. varchar(50) per flessibilità.';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Ricrea l'enum originale (con i 7 valori legacy)
    await queryRunner.query(`
      CREATE TYPE practices_type_enum AS ENUM (
        'TIM_FIBRA', 'VODAFONE', 'WINDTRE', 'ILIAD', 'OPTIMA', 'IREN', 'SKY'
      );
    `);

    // Converte indietro (i valori non nell'enum che sono stati inseriti
    -- dopo la migration up causeranno errore nel down; questa è una limitazione nota)
    await queryRunner.query(`
      ALTER TABLE practices
      ALTER COLUMN type TYPE practices_type_enum
      USING type::practices_type_enum;
    `);
  }
}
