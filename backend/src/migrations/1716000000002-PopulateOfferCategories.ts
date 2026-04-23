import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 1716000000002 - PopulateOfferCategories
 *
 * PROBLEMA: Le offerte esistenti hanno tutte category = 'FIXED_LINE' (default).
 * Quando il SUPER_ADMIN va in /admin/offers?category=MOBILE o ENERGY,
 * vede 0 risultati perché nessuna offerta ha quella categoria.
 *
 * FIX: Aggiorna le offerte esistenti in base al provider, assegnando la
 * categoria corretta (MOBILE o ENERGY). I provider non riconosciuti
 * restano FIXED_LINE.
 */
export class PopulateOfferCategories1716000000002 implements MigrationInterface {
  name = 'PopulateOfferCategories1716000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // MOBILE: provider di rete mobile
    await queryRunner.query(`
      UPDATE offers
      SET category = 'MOBILE'
      WHERE provider IN (
        'TIM', 'VODAFONE', 'WIND3', 'ILIAD', 'KENA', 'HO', 'VERY',
        'OPTIMA', 'ITALIA_POWER', 'EMOBILE24', 'FASTWEB', 'SKY_MOBILE', 'TISCALI'
      )
      AND (category = 'FIXED_LINE' OR category IS NULL);
    `);

    // ENERGY: provider di luce/gas
    await queryRunner.query(`
      UPDATE offers
      SET category = 'ENERGY'
      WHERE provider IN (
        'ENEL', 'ENI_PLENITUDE', 'ACEA', 'EDISON',
        'SERVIZIO_ELETTRICO_NAZIONALE', 'A2A', 'IREN_SEV',
        'SORGENIA', 'SINERGY', 'ENEL_AB_CONTACT', 'ACEA_WIND3',
        'SORGENIA_BOLLETTA_EXPRESS', 'SINERGY_BOLLETTA_EXPRESS',
        'IREN', 'ITALIA_POWER_ENERGY'
      )
      AND (category = 'FIXED_LINE' OR category IS NULL);
    `);

    // Log di verifica (opzionale, per debug)
    const counts = await queryRunner.query(`
      SELECT category, COUNT(*) as count
      FROM offers
      GROUP BY category;
    `);

    console.log('Offerte per categoria dopo popolamento:', counts);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Ripristina tutte le offerte a FIXED_LINE
    await queryRunner.query(`
      UPDATE offers
      SET category = 'FIXED_LINE';
    `);
  }
}
