import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 1716000000004 - SeedMobileOffers
 *
 * Inserisce tutte le offerte mobile nel database con il provider corretto,
 * cosi il wizard mobile Step 1 puo filtrare le offerte per gestore selezionato.
 *
 * Le offerte sono gia presenti come hardcoded nel frontend (OFFERTE_MOBILE),
 * ma il filtro getFilteredOffers cerca prima nel backend. Se il backend e
 * vuoto per un gestore, il dropdown offerte risulta vuoto.
 *
 * Provider mapping (deve matchare PROVIDERS_BY_CATEGORY in offers.tsx):
 *   TIM, VODAFONE, WIND3, ILIAD, KENA, HO, VERY, OPTIMA, ITALIA_POWER,
 *   EMOBILE24, FASTWEB, SKY_MOBILE, TISCALI
 *
 * Il filtro nel wizard usa: name.includes(gestore) || provider.includes(gestore)
 * quindi i nomi offerta che contengono il nome gestore (es. "VODAFONE MOBILE...")
 * matchano automaticamente.
 */
export class SeedMobileOffers1716000000004 implements MigrationInterface {
  name = 'SeedMobileOffers1716000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verifica offerte esistenti per evitare duplicati
    const existing = await queryRunner.query(
      `SELECT name FROM offers WHERE category = 'MOBILE'`
    );
    const existingNames = new Set((existing || []).map((r: any) => r.name));

    const offers = [
      // === TIM (6 offerte) ===
      { provider: 'TIM', name: 'TIM POWER FAMIGLIA 4,99', canone: '4,99€/mese', sort_order: 1 },
      { provider: 'TIM', name: 'TIM 5,99', canone: '5,99€/mese', sort_order: 2 },
      { provider: 'TIM', name: 'TIM 6,99', canone: '6,99€/mese', sort_order: 3 },
      { provider: 'TIM', name: 'TIM 7,99', canone: '7,99€/mese', sort_order: 4 },
      { provider: 'TIM', name: 'TIM 8,99', canone: '8,99€/mese', sort_order: 5 },
      { provider: 'TIM', name: 'TIM 9,99', canone: '9,99€/mese', sort_order: 6 },

      // === VODAFONE (4 offerte) ===
      { provider: 'VODAFONE', name: 'VODAFONE MOBILE START 9,95', canone: '9,95€/mese', sort_order: 10 },
      { provider: 'VODAFONE', name: 'VODAFONE MOBILE PRO 11,95', canone: '11,95€/mese', sort_order: 11 },
      { provider: 'VODAFONE', name: 'VODAFONE MOBILE POWER 14,95', canone: '14,95€/mese', sort_order: 12 },
      { provider: 'VODAFONE', name: 'VODAFONE MOBILE ULTRA 19,95', canone: '19,95€/mese', sort_order: 13 },

      // === WIND3 (5 offerte) - provider e WIND3, nome usa WIND GO ===
      { provider: 'WIND3', name: 'WIND GO XS 5,99', canone: '5,99€/mese', sort_order: 20 },
      { provider: 'WIND3', name: 'WIND GO S 6,99', canone: '6,99€/mese', sort_order: 21 },
      { provider: 'WIND3', name: 'WIND GO UNLIMITED FIRE 6,99', canone: '6,99€/mese', sort_order: 22 },
      { provider: 'WIND3', name: 'WIND GO UNLIMITED FIRE 5G 7,99', canone: '7,99€/mese', sort_order: 23 },
      { provider: 'WIND3', name: 'WIND GO UNLIMITED 9,99', canone: '9,99€/mese', sort_order: 24 },

      // === OPTIMA (2 offerte) ===
      { provider: 'OPTIMA', name: 'OPTIMA MOBILE SMART 4,99', canone: '4,99€/mese', sort_order: 30 },
      { provider: 'OPTIMA', name: 'OPTIMA SUPER MOBILE 5G 6,99', canone: '6,99€/mese', sort_order: 31 },

      // === SKY_MOBILE (4 offerte) ===
      { provider: 'SKY_MOBILE', name: 'SKY MOBILE 9,95', canone: '9,95€/mese', sort_order: 40 },
      { provider: 'SKY_MOBILE', name: 'SKY MOBILE 11,90', canone: '11,90€/mese', sort_order: 41 },
      { provider: 'SKY_MOBILE', name: 'SKY MOBILE 14,95', canone: '14,95€/mese', sort_order: 42 },
      { provider: 'SKY_MOBILE', name: 'SKY MOBILE 19,95', canone: '19,95€/mese', sort_order: 43 },
    ];

    let inserted = 0;
    let skipped = 0;

    for (const o of offers) {
      if (existingNames.has(o.name)) {
        skipped++;
        continue;
      }

      await queryRunner.query(
        `INSERT INTO offers (id, category, provider, name, canone, type, is_active, sort_order, created_at, updated_at)
         VALUES (gen_random_uuid(), 'MOBILE', $1, $2, $3, 'consumer', true, $4, NOW(), NOW())`,
        [o.provider, o.name, o.canone, o.sort_order]
      );
      inserted++;
    }

    console.log(`[SeedMobileOffers] Inserite: ${inserted}, Saltate (esistenti): ${skipped}, Totale: ${offers.length}`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const names = [
      'TIM POWER FAMIGLIA 4,99', 'TIM 5,99', 'TIM 6,99', 'TIM 7,99', 'TIM 8,99', 'TIM 9,99',
      'VODAFONE MOBILE START 9,95', 'VODAFONE MOBILE PRO 11,95', 'VODAFONE MOBILE POWER 14,95', 'VODAFONE MOBILE ULTRA 19,95',
      'WIND GO XS 5,99', 'WIND GO S 6,99', 'WIND GO UNLIMITED FIRE 6,99', 'WIND GO UNLIMITED FIRE 5G 7,99', 'WIND GO UNLIMITED 9,99',
      'OPTIMA MOBILE SMART 4,99', 'OPTIMA SUPER MOBILE 5G 6,99',
      'SKY MOBILE 9,95', 'SKY MOBILE 11,90', 'SKY MOBILE 14,95', 'SKY MOBILE 19,95',
    ];

    await queryRunner.query(
      `DELETE FROM offers WHERE category = 'MOBILE' AND name = ANY($1)`,
      [names]
    );
  }
}
