import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 1775047395772 - PopulateEnergyOffers
 *
 * 1. Allarga le colonne `note` e `scadenza` della tabella `offers` da varchar(50)
 *    a varchar(1000) per poter ospitare descrizioni lunghe delle offerte Energy.
 * 2. Popola il DB con tutte le offerte Energy (luce/gas) dei 7 provider reali.
 *    Idempotente: per ogni offerta verifica se esiste già (name + provider + category)
 *    prima di inserire. Nessun duplicato.
 * 
 * Se vuoi eliminare tutti i record importati da questa migration:
 *   npx typeorm migration:revert -d src/data-source.ts
 */
export class PopulateEnergyOffers1775047395772 implements MigrationInterface {
  name = 'PopulateEnergyOffers1775047395772';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // === 1. Allarga colonne note e scadenza ===
    await queryRunner.query(`ALTER TABLE offers ALTER COLUMN note TYPE VARCHAR(1000)`);
    await queryRunner.query(`ALTER TABLE offers ALTER COLUMN scadenza TYPE VARCHAR(1000)`);

    // === 2. Popola offerte Energy ===
    const offers = [
      { provider: 'OPTIMA', name: 'SUPER CASA SMART LUCE', canone: '0,22', vincolo: '', scadenza: '', type: 'consumer', note: 'PCV: 12 | Pagamento: RID | Switch: SI | Subentro: NO' },
      { provider: 'OPTIMA', name: 'SUER CASA SMART LUCE', canone: '60% VARIABILE PUN +0,044(INCLUSE PERDITE DI RETE) 40% FISSA 0,195 KWH', vincolo: '12 MESI POI PASSA A VARIABILE', scadenza: '', type: 'consumer', note: 'PCV: 9 | Pagamento: RID | Switch: SI | Subentro: NO' },
      { provider: 'OPTIMA', name: 'SUPER CASA SMART LUCE', canone: 'PUN + 0,080', vincolo: 'NESSUNA SCAD.', scadenza: '', type: 'consumer', note: 'PCV: 9 | Cauzione: RID | Fatturazione: 20€ PER KW | Switch: MENSILE | Subentro: SI | NO' },
      { provider: 'OPTIMA', name: 'SUPER CASA SMART GAS', canone: 'PSV + 0,200', vincolo: 'NESSUNA SCAD.', scadenza: '', type: 'consumer', note: 'PCV: 8,9 | Cauzione: RID | Switch: MENSILE | Subentro: NO | SI' },
      { provider: 'OPTIMA', name: 'SUPER IMPRESA SMART LUCE', canone: 'PUN + 0,02', vincolo: 'NESSUNA SCAD.', scadenza: '', type: 'business', note: 'PCV: 17,5 | Cauzione: RID | Switch: MENSILE | Subentro: NO | SI' },
      { provider: 'OPTIMA', name: 'SUPER IMPRESA SMART GAS', canone: 'PSV + 0,15', vincolo: 'NESSUNA SCAD.', scadenza: '', type: 'business', note: 'PCV: 20 | Cauzione: RID | Switch: MENSILE | Subentro: NO | SI' },
      { provider: 'IREN', name: 'IREN SOTTO CASA LUCE', canone: '0,116', vincolo: '12 MESI', scadenza: '', type: 'consumer', note: 'PCV: 13,25 | Pagamento: RID/BOLLETTINO | Cauzione: NO | Fatturazione: BIMESTRALE | Switch: SI | Subentro: NO' },
      { provider: 'IREN', name: 'IREN SOTTO CASA GAS', canone: '0,45', vincolo: '12 MESI', scadenza: '', type: 'consumer', note: 'PCV: 13 | Pagamento: RID/BOLLETTINO | Cauzione: NO | Fatturazione: BIMESTRALE | Switch: NO | Subentro: NO' },
      { provider: 'IREN', name: 'SEV IREN QUICK LUCE', canone: '0,135 (INCLUSE PERDITE DI RETE)', vincolo: '12 MESI', scadenza: '20 marzo', type: 'consumer', note: 'PCV: 11,25 | Pagamento: RID/BOLLETTINO | Cauzione: NO' },
      { provider: 'IREN', name: 'SEV IREN QUICK GAS', canone: '0,57', vincolo: '12 MESI', scadenza: '20 marzo', type: 'consumer', note: 'PCV: 11 | Pagamento: RID/BOLLETTINO | Cauzione: NO' },
      { provider: 'IREN', name: 'IREN TUA AZIENDA  LUCE', canone: '0,172', vincolo: '', scadenza: '', type: 'business', note: 'PCV: 15 | Pagamento: RID/BOLLETTINO | Switch: SI | Subentro: NO' },
      { provider: 'IREN', name: 'IREN TUA AZIENDA GAS', canone: '0,688', vincolo: '', scadenza: '', type: 'business', note: 'PCV: 15 | Pagamento: RID/BOLLETTINO' },
      { provider: 'IREN', name: 'SEV BONUS 60 LUCE GREEN', canone: 'PUN + 0,015', vincolo: '12 MESI', scadenza: '', type: 'consumer', note: 'PCV: 7 | Pagamento: RID/BOLLETTINO | Cauzione: NO | Fatturazione: BIMESTRALE | Switch: SI | Subentro: SI' },
      { provider: 'IREN', name: 'SEV BONUS 60 GAS GREEN', canone: 'PSV + 0,15', vincolo: '12 MESI', scadenza: '', type: 'consumer', note: 'PCV: 7 | Pagamento: RID/BOLLETTINO | Cauzione: NO | Switch: SI | Subentro: SI' },
      { provider: 'IREN', name: 'SEV FULL ENERGY LUCE SPECIAL EDITION', canone: '0,15', vincolo: '12 MESI', scadenza: '', type: 'consumer', note: 'PCV: 11,5 | Pagamento: RID/BOLLETTINO | Cauzione: NO | Fatturazione: BIMESTRALE | Switch: SI | Subentro: SI' },
      { provider: 'IREN', name: 'SEV FULL ENERGY GAS SPECIAL EDITION', canone: '0,61', vincolo: '12 MESI', scadenza: '', type: 'consumer', note: 'PCV: 11,5 | Pagamento: RID/BOLLETTINO | Cauzione: NO | Fatturazione: BIMESTRALE | Switch: SI | Subentro: SI' },
      { provider: 'IREN', name: 'SEV FULL ENERGY LUCE (CONV FIBRA)', canone: 'PUN + 0,045', vincolo: 'NESSUNA SCAD.', scadenza: '', type: 'consumer', note: 'PCV: 12 | Pagamento: RID/BOLLETTINO | Cauzione: NO | Fatturazione: BIMESTRALE | Switch: SI | Subentro: SI' },
      { provider: 'IREN', name: 'SEV FULL ENERGY GAS (CONV FIBRA)', canone: 'PSV + 0,20', vincolo: 'NESSUNA SCAD.', scadenza: '', type: 'consumer', note: 'PCV: 12 | Pagamento: RID/BOLLETTINO | Cauzione: NO | Fatturazione: BIMESTRALE | Switch: SI | Subentro: SI' },
      { provider: 'ITALIA POWER', name: 'MONETITO FIX', canone: '0,139', vincolo: '12 MESI', scadenza: '31/03', type: 'consumer', note: 'PCV: 13,5' },
      { provider: 'ITALIA POWER', name: 'MONETITO FIX', canone: '0,49', vincolo: '12 MESI', scadenza: '31/03', type: 'consumer', note: 'PCV: 11,9' },
      { provider: 'ITALIA POWER', name: 'PUN ZERO', canone: 'PUN + 0', vincolo: 'NESSUNA SCAD.', scadenza: 'DA OGGI SE IL CLIENTE ATTIVA DUAL LUCE E GAS HA DIRITTO ALL\'ASSICURAZIONE RC CASA INCLUSA', type: 'consumer', note: 'PCV: 13,5 | Pagamento: RID/BOLLETTINO | Fatturazione: MENSILE/BIMESTRALE | Switch: SI' },
      { provider: 'ITALIA POWER', name: '"PSV Day Ahead (DA) + 0,09"', canone: 'PSV + 0,09', vincolo: 'NESSUNA SCAD.', scadenza: '', type: 'consumer', note: 'PCV: 12,9 | Pagamento: RID/BOLLETTINO | Switch: SI' },
      { provider: 'ITALIA POWER', name: 'SUMMER LUCE', canone: 'PUN + 0,019', vincolo: 'NESSUNA SCAD.', scadenza: '', type: 'consumer', note: 'PCV: 9,5 | Pagamento: RID/BOLLETTINO | Switch: SI' },
      { provider: 'ITALIA POWER', name: 'MONETITO ALTRI USI MONO (SCALE/GARAGE CON CF.)', canone: 'PUN+ 0,019', vincolo: 'NESSUNA SCAD.', scadenza: '', type: 'business', note: 'PCV: 13,5 | Pagamento: RID/BOLLETTINO' },
      { provider: 'ITALIA POWER', name: 'SMART BUSINESS LUCE', canone: 'PUN+0,019', vincolo: 'NESSUNA SCAD.', scadenza: '', type: 'business', note: 'PCV: 12,9 | Pagamento: RID/BOLLETTINO | Switch: NO' },
      { provider: 'ITALIA POWER', name: 'PSV 19 BUSINESS', canone: 'PSV+0,09', vincolo: '', scadenza: '', type: 'business', note: 'PCV: 24,9 | Pagamento: RID/BOLLETTINO' },
      { provider: 'WINDTRE', name: 'NEW START CASA', canone: 'PUN+0,027', vincolo: '24 MESI', scadenza: '', type: 'consumer', note: 'PCV: 7,50 (CLT W3)/13 | Pagamento: RID/BOLLETTINO | Cauzione: SI BP | Fatturazione: MENSILE | Switch: SI | Subentro: NO' },
      { provider: 'WINDTRE', name: 'NEW START CASA', canone: 'PSV+0,09', vincolo: '24 MESI', scadenza: '', type: 'consumer', note: 'PCV: 7,50 (CLT W3)/13 | Pagamento: RID/BOLLETTINO | Cauzione: SI  BP | Fatturazione: MENSILE | Switch: SI | Subentro: NO' },
      { provider: 'WINDTRE', name: 'NEW START PRO', canone: 'PUN+0,027', vincolo: '24 MESI', scadenza: '', type: 'business', note: 'PCV: 9,50 (CLT W3)/17,50 | Pagamento: RID/BOLLETTINO | Cauzione: SI  BP | Fatturazione: MENSILE | Switch: SI | Subentro: NO' },
      { provider: 'WINDTRE', name: 'NEW START PRO', canone: 'PSV+0,09', vincolo: '24 MESI', scadenza: '', type: 'business', note: 'PCV: 9,50 (CLT W3)/17,50 | Pagamento: RID/BOLLETTINO | Cauzione: SI BP | Fatturazione: MENSILE | Switch: SI | Subentro: NO' },
      { provider: 'WINDTRE', name: 'FLEX', canone: 'PUN+ 0,025', vincolo: '24 MESI', scadenza: '', type: 'consumer', note: 'PCV: 8 (CLT) /13 | Pagamento: RID | Fatturazione: MENSILE | Switch: SI | Subentro: SI | RID ANCHE INTESTATARIO DIFFERENTE' },
      { provider: 'WINDTRE', name: 'BUSINESS FLEX', canone: 'PUN+ 0,037', vincolo: '24 MESI', scadenza: '', type: 'business', note: 'PCV: 5 (CLT) /20 | Pagamento: RID | Fatturazione: MENSILE | Switch: SI | Subentro: SI | RID ANCHEINTESTATARIO DIFFERENTE' },
      { provider: 'ACEA', name: 'ACEA FIX', canone: '0,181', vincolo: '12 MESI', scadenza: '', type: 'consumer', note: 'PCV: 12 | Pagamento: RID/BOLLETTINO | Cauzione: NO | Fatturazione: MENSILE | Switch: SI | Subentro: NO | RID ANCHE CON INTESTATARIO DIFFERENTE' },
      { provider: 'ACEA', name: 'ACEA FIX', canone: 'FISSO 0,66', vincolo: '12 MESI', scadenza: '', type: 'consumer', note: 'PCV: 12 | Pagamento: RID/BOLLETTINO | Fatturazione: MENSILE | Switch: SI | Subentro: SI | RID ANCHE CON INTESTATARIO DIFFERENTE' },
      { provider: 'ACEA', name: 'ACEA SPRINT LUCE', canone: 'PUN+0,142', vincolo: '12 MESI', scadenza: '', type: 'consumer', note: 'PCV: 10 | Pagamento: RID/BOLLETTINO | Fatturazione: MENSILE | Switch: SI | Subentro: SI | RID ANCHE CON INTESTATARIO DIFFERENTE' },
      { provider: 'ACEA', name: 'ACEA SPRINT GAS', canone: 'PSV+ 0,053', vincolo: '12 MESI', scadenza: '', type: 'consumer', note: 'PCV: 10 | Pagamento: RID/BOLLETTINO | Fatturazione: MENSILE | Switch: SI | Subentro: SI | RID ANCHE CON INTESTATARIO DIFFERENTE' },
      { provider: 'ACEA', name: 'ACEA FLEX', canone: 'PUN+ 0,03', vincolo: '12 MESI', scadenza: '', type: 'consumer', note: 'PCV: 9 | Pagamento: RID/BOLLETTINO | Fatturazione: MENSILE | Switch: SI | Subentro: SI | RID ANCHE CON INTESTATARIO DIFFERENTE' },
      { provider: 'ACEA', name: 'ACEA FLEX', canone: 'PSV+ 0,122', vincolo: '12 MESI', scadenza: '', type: 'consumer', note: 'PCV: 9 | Pagamento: RID/BOLLETTINO | Fatturazione: MENSILE | Switch: SI | Subentro: SI | RID ANCHE CON INTESTATARIO DIFFERENTE' },
      { provider: 'ACEA', name: 'ACEA SPRINT BUSINESS', canone: 'PUN+  0,016', vincolo: '12 MESI', scadenza: '', type: 'business', note: 'PCV: 13 | Pagamento: RID/BOLLETTINO | Fatturazione: MENSILE | Switch: SI | Subentro: SI | RID ANCHE CON INTESTATARIO DIFFERENTE' },
      { provider: 'ACEA', name: 'ACEA SPRINT BUSINESS', canone: 'PSV+ 0,056', vincolo: '12 MESI', scadenza: '', type: 'business', note: 'PCV: 13 | Pagamento: RID/BOLLETTINO | Fatturazione: MENSILE | Switch: SI | Subentro: SI | RID ANCHE CON INTESTATARIO DIFFERENTE' },
      { provider: 'ACEA', name: 'START (5 ANNI)', canone: 'FINO A 800 KWH', vincolo: '5 ANNI', scadenza: '', type: 'consumer', note: 'PCV: 30' },
      { provider: 'ACEA', name: 'LIGHT (5 ANNI)', canone: 'FINO A 1500 KWH', vincolo: '5 ANNI', scadenza: '', type: 'consumer', note: 'PCV: 45' },
      { provider: 'ACEA', name: 'PRO', canone: 'FINO A 2500 KWH', vincolo: '5 ANNI', scadenza: '', type: 'consumer', note: 'PCV: 65 | Pagamento: RID | Fatturazione: MENSILE | Switch: NO | Subentro: NO | RID ANCHE CON INTESTATARIO DIFFERENTE' },
      { provider: 'ACEA', name: 'MAXI', canone: 'FINO A 3500 KWH', vincolo: '5 ANNI', scadenza: '', type: 'consumer', note: 'PCV: 80 | Pagamento: RID | Fatturazione: MENSILE | Switch: NO | Subentro: NO | RID ANCHE CON INTESTATARIO DIFFERENTE' },
      { provider: 'FASTWEB', name: 'ULTRA', canone: 'FINO A 4500 KWH', vincolo: '5 ANNI', scadenza: '', type: 'consumer', note: 'PCV: 95 | Pagamento: RID | Fatturazione: MENSILE | Switch: NO | Subentro: NO | RID ANCHE CON INTESTATARIO DIFFERENTE' },
      { provider: 'FASTWEB', name: 'FIX', canone: '0,18', vincolo: '12 MESI', scadenza: '', type: 'consumer', note: 'PCV: 8/13 | Pagamento: RID | Fatturazione: MENSILE | Switch: NO | Subentro: NO | RID ANCHE CON INTESTATARIO DIFFERENTE' },
      { provider: 'FASTWEB', name: 'FLEX', canone: 'PUN+0,026', vincolo: '12MESI', scadenza: '', type: 'consumer', note: 'PCV: 8/13 | Pagamento: RID | Fatturazione: MENSILE | Switch: SI | Subentro: SI | RID ANCHE CON INTESTATARIO DIFFERENTE' },
      { provider: 'FASTWEB', name: 'FIX', canone: '0,16', vincolo: '12 MESI', scadenza: '', type: 'business', note: 'PCV: 10/20 | Pagamento: RID | Fatturazione: MENSILE | Switch: NO | Subentro: NO | RID ANCHE CON INTESTATARIO DIFFERENTE' },
      { provider: 'FASTWEB', name: 'FLEX', canone: 'PUN+0,030', vincolo: '12 MESI', scadenza: '', type: 'business', note: 'PCV: 10/20 | Pagamento: RID | Fatturazione: MENSILE | Switch: SI | Subentro: SI | RID ANCHE CON INTESTATARIO DIFFERENTE' },
      { provider: 'A2A', name: 'SMART CASA', canone: 'PUN+ 0,025', vincolo: '12 MESI', scadenza: '', type: 'consumer', note: 'PCV: 9,5 | Pagamento: RID/BOLLETTINO | Cauzione: €5,20 PER KW | Fatturazione: BIMESTRALE | Switch: SI | Subentro: SI' },
      { provider: 'A2A', name: 'ESCLUSIVA 2 A', canone: 'FISSO 0,139', vincolo: '12 MESI', scadenza: '', type: 'consumer', note: 'PCV: 9,5 | Pagamento: RID/BOLLETTINO | Cauzione: €5,20 PER KW | Fatturazione: BIMESTRALE | Switch: NO | Subentro: NO' },
      { provider: 'A2A', name: 'A2A START', canone: 'FISSO 0,134', vincolo: '12 MESI', scadenza: '', type: 'consumer', note: 'PCV: 9,5 | Pagamento: RID/BOLLETTINO | Cauzione: €5,20 PER KW | Fatturazione: BIMESTRALE | Switch: SI | Subentro: SI' },
      { provider: 'A2A', name: 'SMART CASA', canone: 'PSV+0,12', vincolo: '12 MESI', scadenza: '', type: 'consumer', note: 'PCV: 9,5 | Pagamento: RID/BOLLETTINO | Cauzione: €5,20 PER KW | Fatturazione: BIMESTRALE | Switch: NO | Subentro: NO' },
      { provider: 'A2A', name: 'ESCLUSIVA A2A', canone: 'FISSO 0,44', vincolo: '12 MESI', scadenza: '', type: 'consumer', note: 'PCV: 9,5 | Pagamento: RID/BOLLETTINO | Fatturazione: BIMESTRALE | Switch: SI' },
      { provider: 'A2A', name: 'A2A START', canone: 'FISSO 0,40', vincolo: '24 MESI', scadenza: '', type: 'consumer', note: 'PCV: 9,5 | Pagamento: RID/BOLLETTINO | Fatturazione: BIMESTRALE | Switch: NO' },
      { provider: 'A2A', name: 'NOI 2', canone: '0,105 +0,020', vincolo: '', scadenza: '', type: 'consumer', note: 'PCV: 9,5 | Pagamento: RID/BOLLETTINO | Fatturazione: BIMESTRALE' },
      { provider: 'A2A', name: 'SMART LUCE BUSINESS', canone: 'PUN+0,20', vincolo: '12 MESI', scadenza: '', type: 'business', note: 'PCV: 15 | Pagamento: RID/BOLLETTINO | Fatturazione: BIMESTRALE' },
      { provider: 'A2A', name: 'ESCLUSIVA A2A BUSINESS', canone: 'FISSO 0,152', vincolo: '12 MESI', scadenza: '', type: 'business', note: 'PCV: 15 | Pagamento: RID/BOLLETTINO | Fatturazione: BIMESTRALE' },
      { provider: 'A2A', name: 'PREZZO SICURO BUSINESS', canone: 'FISSO 0,147', vincolo: '24 MESI', scadenza: '', type: 'business', note: 'PCV: 15 | Pagamento: RID/BOLLETTINO | Fatturazione: BIMESTRALE' },
      { provider: 'A2A', name: 'SMART BUSINESS', canone: 'PSV+,011', vincolo: '12 MESI', scadenza: '', type: 'business', note: 'PCV: 15 | Pagamento: RID/BOLLETTINO | Fatturazione: BIMESTRALE' },
    ];

    for (const offer of offers) {
      const exists = await queryRunner.query(
        `SELECT id FROM offers WHERE name = $1 AND provider = $2 AND category = 'ENERGY'`,
        [offer.name, offer.provider],
      );
      if (exists.length === 0) {
        await queryRunner.query(
          `INSERT INTO offers (id, category, provider, name, canone, attivazione, vincolo, note, disattivazione, type, scadenza, is_active, sort_order)
           VALUES (uuid_generate_v4(), 'ENERGY', $1, $2, $3, NULL, $4, $5, NULL, $6, $7, true, 0)`,
          [offer.provider, offer.name, offer.canone, offer.vincolo, offer.note, offer.type, offer.scadenza],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rimuove SOLO le offerte Energy dei provider importati da questa migration
    await queryRunner.query(
      `DELETE FROM offers WHERE category = 'ENERGY' AND provider IN ('OPTIMA','IREN','ITALIA POWER','WINDTRE','ACEA','FASTWEB','A2A')`
    );

    // Ripristina dimensioni colonne (opzionale, sicuro se non ci sono altri dati lunghi)
    await queryRunner.query(`ALTER TABLE offers ALTER COLUMN note TYPE VARCHAR(50)`);
    await queryRunner.query(`ALTER TABLE offers ALTER COLUMN scadenza TYPE VARCHAR(50)`);
  }
}
