import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 1775047395774 - PopulateFixedLineOffers
 *
 * Inserisce in modo IDEMPOTENTE le 9 offerte TIM rete fissa reali.
 * NON tocca, NON aggiorna e NON elimina alcuna offerta pre-esistente.
 * Se un'offerta con lo stesso name+provider+category esiste già, viene saltata.
 */
export class PopulateFixedLineOffers1775047395774 implements MigrationInterface {
  name = 'PopulateFixedLineOffers1775047395774';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const offers = [
      { name: 'TIM WIFI CASA+NETFLIX', canone: '€27,90', attivazione: '€39 (0€ FWA)', vincolo: '48 MESI', note: 'ILLIMITATE | CAUZIONE 99€ | Penale: 5€ per ogni mese residuo', disattivazione: '5€ PER OGNI MESE RESIDUO', details: '{"tipo_connessione":"FTTH/FTTC","servizi_inclusi":"NETFLIX","cauzione":"99€"}' },
      { name: 'TIM WIFI CASA+NETFLIX+DISNEY', canone: '€31,90', attivazione: '€39 (0€ FWA)', vincolo: '48 MESI', note: 'ILLIMITATE | CAUZIONE 99€ | Penale: 5€ per ogni mese residuo', disattivazione: '5€ PER OGNI MESE RESIDUO', details: '{"tipo_connessione":"FTTH/FTTC","servizi_inclusi":"NETFLIX+DISNEY","cauzione":"99€"}' },
      { name: 'TIM WIFI CASA+NETFLIX+DISNEY+PRIME', canone: '€33,90', attivazione: '€39 (0€ FWA)', vincolo: '48 MESI', note: 'ILLIMITATE | CAUZIONE 99€ | Penale: 5€ per ogni mese residuo', disattivazione: '5€ PER OGNI MESE RESIDUO', details: '{"tipo_connessione":"FTTH/FTTC","servizi_inclusi":"NETFLIX+DISNEY+PRIME","cauzione":"99€"}' },
      { name: 'TIM WIFI CASA IN CONVERGENZA', canone: '€24,90', attivazione: '€39 (0€ FWA)', vincolo: '48 MESI', note: 'ILLIMITATE | CAUZIONE 99€ | Penale: 5€ per ogni mese residuo', disattivazione: '5€ PER OGNI MESE RESIDUO', details: '{"tipo_connessione":"FTTH/FTTC","servizi_inclusi":"","cauzione":"99€","convergenza":true}' },
      { name: 'TIM WIFI CASA DA PROPONI+TIM VISION XS', canone: '€24,90', attivazione: '€39 (0€ FWA)', vincolo: '48 MESI', note: 'ILLIMITATE | CAUZIONE 99€ | Penale: 5€ per ogni mese residuo', disattivazione: '5€ PER OGNI MESE RESIDUO', details: '{"tipo_connessione":"FTTH/FTTC","servizi_inclusi":"TIM VISION XS","cauzione":"99€"}' },
      { name: 'TIM PREMIUM BASE (MODEM NON INCLUSO)', canone: '€25,90', attivazione: '0€', vincolo: '24 MESI', note: 'ILLIMITATE | CAUZIONE 99€ | Penale: 10€ per ogni mese residuo | Modem non incluso', disattivazione: '10€ PER OGNI MESE RESIDUO', details: '{"tipo_connessione":"FTTH/FTTC","servizi_inclusi":"","cauzione":"99€","modem_incluso":false}' },
      { name: 'TIM WIFI SPECIAL CARTA GIOVANI (UNDER 35)', canone: '€21,90', attivazione: '€39', vincolo: '24 MESI', note: 'A CONSUMO | CAUZIONE 99€ | Penale: 10€ per ogni mese residuo | Under 35', disattivazione: '10€ PER OGNI MESE RESIDUO', details: '{"tipo_connessione":"FTTH/FTTC","servizi_inclusi":"","cauzione":"99€","target":"UNDER_35"}' },
      { name: 'TIM FWA SECONDA CASA', canone: '€14,90', attivazione: '0€', vincolo: '48 MESI', note: 'ILLIMITATE | CAUZIONE 99€ | Penale: 5€ per ogni mese residuo | FWA Seconda Casa', disattivazione: '5€ PER OGNI MESE RESIDUO', details: '{"tipo_connessione":"FWA","servizi_inclusi":"","cauzione":"99€","seconda_casa":true}' },
      { name: 'TIM FIBRA SECONDA CASA', canone: '€22,90', attivazione: '0€', vincolo: '48 MESI', note: 'ILLIMITATE | CAUZIONE 99€ | Penale: 5€ per ogni mese residuo | Fibra Seconda Casa', disattivazione: '5€ PER OGNI MESE RESIDUO', details: '{"tipo_connessione":"FTTH/FTTC","servizi_inclusi":"","cauzione":"99€","seconda_casa":true}' },
    ];

    for (const offer of offers) {
      const exists = await queryRunner.query(
        `SELECT id FROM offers WHERE name = $1 AND provider = 'TIM_FIBRA' AND category = 'FIXED_LINE'`,
        [offer.name],
      );
      if (exists.length === 0) {
        await queryRunner.query(
          `INSERT INTO offers (id, category, provider, name, canone, attivazione, vincolo, note, disattivazione, type, scadenza, is_active, sort_order, details)
           VALUES (uuid_generate_v4(), 'FIXED_LINE', 'TIM_FIBRA', $1, $2, $3, $4, $5, $6, 'consumer', '', true, 0, $7)`,
          [offer.name, offer.canone, offer.attivazione, offer.vincolo, offer.note, offer.disattivazione, offer.details],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rimuove SOLO le 9 offerte TIM_FIBRA FIXED_LINE inserite da questa migration
    // (identificate per nome esatto, così non tocca altre offerte pre-esistenti)
    await queryRunner.query(
      `DELETE FROM offers WHERE category = 'FIXED_LINE' AND provider = 'TIM_FIBRA' AND name IN (
        'TIM WIFI CASA+NETFLIX',
        'TIM WIFI CASA+NETFLIX+DISNEY',
        'TIM WIFI CASA+NETFLIX+DISNEY+PRIME',
        'TIM WIFI CASA IN CONVERGENZA',
        'TIM WIFI CASA DA PROPONI+TIM VISION XS',
        'TIM PREMIUM BASE (MODEM NON INCLUSO)',
        'TIM WIFI SPECIAL CARTA GIOVANI (UNDER 35)',
        'TIM FWA SECONDA CASA',
        'TIM FIBRA SECONDA CASA'
      )`
    );
  }
}