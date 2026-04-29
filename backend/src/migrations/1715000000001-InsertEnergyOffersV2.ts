import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertEnergyOffersV21715000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================
    // OFFERTE ENERGIA V2 — Inserimento con details JSONB strutturato
    // ============================================================
    // Ogni offerta ha il campo details popolato con tutti i metadati
    // specifici per categoria ENERGY (fornitura, f1, pcv, pagamento...).
    // I campi base (canone, vincolo, scadenza) sono popolati con i valori
    // corretti dalle colonne del catalogo fornitori.

    // ────────────────────────────────────────────────────────────
    // OPTIMA
    // ────────────────────────────────────────────────────────────
    // ── LUCE ──
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('3244d642-5cbb-4474-a62a-ec54d50efa30', 'ENERGY', 'OPTIMA', 'SUPER CASA SMART LUCE', 'consumer', '12', '', '', '', '', '', true, 10, '{"fornitura":"LUCE","tipologia":"CONSUMER","tipo_offerta":"FISSO","f1":"0,22","pcv":"12","pagamento":"RID","switch":"SI","subentro":"NO"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('5054a646-fcfe-45a3-a838-5f2ebdd6009c', 'ENERGY', 'OPTIMA', 'SUER CASA SMART LUCE', 'consumer', '9', '', '12 MESI POI PASSA A VARIABILE', '', '', '', true, 20, '{"fornitura":"LUCE","tipologia":"CONSUMER","tipo_offerta":"MISTA","f1":"60% VARIABILE PUN +0,044(INCLUSE PERDITE DI RETE) 40% FISSA 0,195 KWH","pcv":"9","durata":"12 MESI POI PASSA A VARIABILE","pagamento":"RID","switch":"SI","subentro":"NO"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('84b22bea-2eaf-4779-8aa8-34af1085ac1e', 'ENERGY', 'OPTIMA', 'SUPER CASA SMART LUCE', 'consumer', '9', '', 'NESSUNA SCAD.', '', '', '', true, 30, '{"fornitura":"LUCE","tipologia":"CONSUMER","tipo_offerta":"VARIABILE","f1":"PUN + 0,080","pcv":"9","durata":"NESSUNA SCAD.","pagamento":"RID","cauzione_bolletta":"20€ PER KW","fatturazione":"MENSILE","switch":"SI","subentro":"NO","note_condizioni":"IL CLIENTE CHE NON VUOLE LA DOMICILIAZONE SI ATTIVA IN  DOMICILIAZIONE ED APPENA ATTIVO SI SGANCIA(SOLO RID BANCARIO E POSTALE NO RICARICABILI)"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('6331cc40-f9f4-4c59-a421-ea7a2461ecad', 'ENERGY', 'OPTIMA', 'SUPER IMPRESA SMART LUCE', 'business', '17,5', '', 'NESSUNA SCAD.', '', '', '', true, 40, '{"fornitura":"LUCE","tipologia":"BUSINESS","tipo_offerta":"VARIABILE","f1":"PUN + 0,02","pcv":"17,5","durata":"NESSUNA SCAD.","pagamento":"RID","fatturazione":"MENSILE","switch":"NO","subentro":"SI"}'::jsonb)
    `);

    // ── GAS ──
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('bce72ad0-dfe8-47ca-94e4-a10c8eb0b71c', 'ENERGY', 'OPTIMA', 'SUPER CASA SMART GAS', 'consumer', '8,9', '', 'NESSUNA SCAD.', '', '', '', true, 50, '{"fornitura":"GAS","tipologia":"CONSUMER","tipo_offerta":"VARIABILE","f1":"PSV + 0,200","pcv":"8,9","durata":"NESSUNA SCAD.","pagamento":"RID","fatturazione":"MENSILE","switch":"NO","subentro":"SI","note_condizioni":"IL CLIENTE CHE NON VUOLE LA DOMICILIAZONE SI ATTIVA IN  DOMICILIAZIONE ED APPENA ATTIVO SI SGANCIA (SOLO RID BANCARIO E POSTALE NO RICARICABILI)"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('04609217-6af6-45e4-9c6f-328cde779fee', 'ENERGY', 'OPTIMA', 'SUPER IMPRESA SMART GAS', 'business', '20', '', 'NESSUNA SCAD.', '', '', '', true, 60, '{"fornitura":"GAS","tipologia":"BUSINESS","tipo_offerta":"VARIABILE","f1":"PSV + 0,15","pcv":"20","durata":"NESSUNA SCAD.","pagamento":"RID","fatturazione":"MENSILE","switch":"NO","subentro":"SI"}'::jsonb)
    `);

    // ────────────────────────────────────────────────────────────
    // IREN
    // ────────────────────────────────────────────────────────────
    // ── LUCE ──
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('cf085fab-1429-47ec-926f-0e00fbbbc667', 'ENERGY', 'IREN', 'IREN SOTTO CASA LUCE', 'consumer', '13,25', '', '12 MESI', '', '', '', true, 70, '{"fornitura":"LUCE","tipologia":"CONSUMER","tipo_offerta":"FISSO","f1":"0,116","pcv":"13,25","durata":"12 MESI","pagamento":"RID/BOLLETTINO","cauzione_bolletta":"NO","fatturazione":"BIMESTRALE","switch":"SI","subentro":"NO"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('09c0b9ee-9bc0-4bd3-a9ea-85aa324e8538', 'ENERGY', 'IREN', 'SEV IREN QUICK LUCE', 'consumer', '11,25', '', '12 MESI', '20 marzo', '', '', true, 80, '{"fornitura":"LUCE","tipologia":"CONSUMER","tipo_offerta":"FISSO","f1":"0,135 (INCLUSE PERDITE DI RETE)","pcv":"11,25","durata":"12 MESI","scadenza_offerta":"20 marzo","pagamento":"RID/BOLLETTINO","cauzione_bolletta":"NO"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('2197d2be-f084-4b56-a36c-ad3230122628', 'ENERGY', 'IREN', 'IREN TUA AZIENDA  LUCE', 'business', '15', '', '', '', '', '', true, 90, '{"fornitura":"LUCE","tipologia":"BUSINESS","tipo_offerta":"FISSO","f1":"0,172","pcv":"15","pagamento":"RID/BOLLETTINO","switch":"SI","subentro":"NO"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('015fab80-c2bb-457d-b058-4f3bf7cb7163', 'ENERGY', 'IREN', 'SEV BONUS 60 LUCE GREEN', 'consumer', '7', '', '12 MESI', '', '', '', true, 100, '{"fornitura":"LUCE","tipologia":"CONSUMER","tipo_offerta":"VARIABILE","f1":"PUN + 0,015","pcv":"7","durata":"12 MESI","pagamento":"RID/BOLLETTINO","cauzione_bolletta":"NO","fatturazione":"BIMESTRALE","switch":"SI","subentro":"SI"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('7dfaf664-a643-40ac-8067-435203c8eb50', 'ENERGY', 'IREN', 'SEV FULL ENERGY LUCE SPECIAL EDITION', 'consumer', '11,5', '', '12 MESI', '', '', '', true, 110, '{"fornitura":"LUCE","tipologia":"CONSUMER","tipo_offerta":"FISSO","f1":"0,15","pcv":"11,5","durata":"12 MESI","pagamento":"RID/BOLLETTINO","cauzione_bolletta":"NO","fatturazione":"BIMESTRALE","switch":"SI","subentro":"SI"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('0f8e845c-be5d-4c7a-9605-032126fcbaa5', 'ENERGY', 'IREN', 'SEV FULL ENERGY LUCE (CONV FIBRA)', 'consumer', '12', '', 'NESSUNA SCAD.', '', '', '', true, 120, '{"fornitura":"LUCE","tipologia":"CONSUMER","tipo_offerta":"VARIABILE","f1":"PUN + 0,045","pcv":"12","durata":"NESSUNA SCAD.","pagamento":"RID/BOLLETTINO","cauzione_bolletta":"NO","fatturazione":"BIMESTRALE","switch":"SI","subentro":"SI"}'::jsonb)
    `);

    // ── GAS ──
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('bd8d647d-119a-4701-b7ae-d3dae7f08d0c', 'ENERGY', 'IREN', 'IREN SOTTO CASA GAS', 'consumer', '13', '', '12 MESI', '', '', '', true, 130, '{"fornitura":"GAS","tipologia":"CONSUMER","tipo_offerta":"FISSO","f1":"0,45","pcv":"13","durata":"12 MESI","pagamento":"RID/BOLLETTINO","cauzione_bolletta":"NO","fatturazione":"BIMESTRALE","switch":"NO","subentro":"NO"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('d51c3bd5-b9b3-4db9-852f-edcbe592a874', 'ENERGY', 'IREN', 'SEV IREN QUICK GAS', 'consumer', '11', '', '12 MESI', '20 marzo', '', '', true, 140, '{"fornitura":"GAS","tipologia":"CONSUMER","tipo_offerta":"FISSO","f1":"0,57","pcv":"11","durata":"12 MESI","scadenza_offerta":"20 marzo","pagamento":"RID/BOLLETTINO","cauzione_bolletta":"NO"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('c87ef672-c3c6-4517-b89f-6eab27a766a5', 'ENERGY', 'IREN', 'IREN TUA AZIENDA GAS', 'business', '15', '', '', '', '', '', true, 150, '{"fornitura":"GAS","tipologia":"BUSINESS","tipo_offerta":"FISSO","f1":"0,688","pcv":"15","pagamento":"RID/BOLLETTINO"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('f20886e7-28c8-4e7c-a7eb-21458bb4e9ef', 'ENERGY', 'IREN', 'SEV BONUS 60 GAS GREEN', 'consumer', '7', '', '12 MESI', '', '', '', true, 160, '{"fornitura":"GAS","tipologia":"CONSUMER","tipo_offerta":"VARIABILE","f1":"PSV + 0,15","pcv":"7","durata":"12 MESI","pagamento":"RID/BOLLETTINO","cauzione_bolletta":"NO","switch":"SI","subentro":"SI"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('89eabf3b-4b48-4167-8ed6-22abfb4bfde8', 'ENERGY', 'IREN', 'SEV FULL ENERGY GAS SPECIAL EDITION', 'consumer', '11,5', '', '12 MESI', '', '', '', true, 170, '{"fornitura":"GAS","tipologia":"CONSUMER","tipo_offerta":"FISSO","f1":"0,61","pcv":"11,5","durata":"12 MESI","pagamento":"RID/BOLLETTINO","cauzione_bolletta":"NO","fatturazione":"BIMESTRALE","switch":"SI","subentro":"SI"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('384c88c3-2409-4bda-8099-f24fe33a8be4', 'ENERGY', 'IREN', 'SEV FULL ENERGY GAS (CONV FIBRA)', 'consumer', '12', '', 'NESSUNA SCAD.', '', '', '', true, 180, '{"fornitura":"GAS","tipologia":"CONSUMER","tipo_offerta":"VARIABILE","f1":"PSV + 0,20","pcv":"12","durata":"NESSUNA SCAD.","pagamento":"RID/BOLLETTINO","cauzione_bolletta":"NO","fatturazione":"BIMESTRALE","switch":"SI","subentro":"SI"}'::jsonb)
    `);

    // ────────────────────────────────────────────────────────────
    // ITALIA POWER
    // ────────────────────────────────────────────────────────────
    // ── LUCE ──
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('a4021851-668c-491f-a87f-69f4cceb4de0', 'ENERGY', 'ITALIA POWER', 'MONETITO FIX', 'consumer', '13,5', '', '12 MESI', '31/03', '', '', true, 190, '{"fornitura":"LUCE","tipologia":"CONSUMER","tipo_offerta":"FISSO","f1":"0,139","pcv":"13,5","durata":"12 MESI","scadenza_offerta":"31/03"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('b98bfe57-0165-4b2c-82d8-90dd013f9d8e', 'ENERGY', 'ITALIA POWER', 'PUN ZERO', 'consumer', '13,5', '', 'NESSUNA SCAD.', 'DA OGGI SE IL CLIENTE ATTIVA DUAL LUCE E GAS HA DIRITTO ALL''ASSICURAZIONE RC CASA INCLUSA', '', '', true, 200, '{"fornitura":"LUCE","tipologia":"CONSUMER","tipo_offerta":"VARIABILE","f1":"PUN + 0","pcv":"13,5","durata":"NESSUNA SCAD.","scadenza_offerta":"DA OGGI SE IL CLIENTE ATTIVA DUAL LUCE E GAS HA DIRITTO ALL''ASSICURAZIONE RC CASA INCLUSA","pagamento":"RID/BOLLETTINO","fatturazione":"MENSILE/BIMESTRALE","switch":"SI"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('cb301fc0-c31b-402c-9a68-3eb9dc9d6302', 'ENERGY', 'ITALIA POWER', 'SUMMER LUCE', 'consumer', '9,5', '', 'NESSUNA SCAD.', '', '', '', true, 210, '{"fornitura":"LUCE","tipologia":"CONSUMER","tipo_offerta":"VARIABILE","f1":"PUN + 0,019","pcv":"9,5","durata":"NESSUNA SCAD.","pagamento":"RID/BOLLETTINO","switch":"SI"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('c58f4144-ef73-4f54-b806-b51a55ea2e91', 'ENERGY', 'ITALIA POWER', 'MONETITO ALTRI USI MONO (SCALE/GARAGE CON CF.)', 'business', '13,5', '', 'NESSUNA SCAD.', '', '', '', true, 220, '{"fornitura":"LUCE","tipologia":"BUSINESS","tipo_offerta":"VARIABILE","f1":"PUN+ 0,019","pcv":"13,5","durata":"NESSUNA SCAD.","pagamento":"RID/BOLLETTINO"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('5af6ed8c-8e69-43e9-ad83-f690cbc073be', 'ENERGY', 'ITALIA POWER', 'SMART BUSINESS LUCE', 'business', '12,9', '', 'NESSUNA SCAD.', '', '', '', true, 230, '{"fornitura":"LUCE","tipologia":"BUSINESS","tipo_offerta":"VARIABILE","f1":"PUN+0,019","pcv":"12,9","durata":"NESSUNA SCAD.","pagamento":"RID/BOLLETTINO","switch":"NO"}'::jsonb)
    `);

    // ── GAS ──
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('ae54a59f-ec6d-4918-8612-679e37126bf7', 'ENERGY', 'ITALIA POWER', 'MONETITO FIX', 'consumer', '11,9', '', '12 MESI', '31/03', '', '', true, 240, '{"fornitura":"GAS","tipologia":"CONSUMER","tipo_offerta":"FISSO","f1":"0,49","pcv":"11,9","durata":"12 MESI","scadenza_offerta":"31/03"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('4751f083-e974-49b7-b4dd-c2312bbe0fbe', 'ENERGY', 'ITALIA POWER', 'PSV DAY AHEAD (DA) + 0,09', 'consumer', '12,9', '', 'NESSUNA SCAD.', 'RID/BOLLETTINO', '', '', true, 250, '{"fornitura":"GAS","tipologia":"CONSUMER","tipo_offerta":"VARIABILE","pcv":"12,9","f1":"PSV + 0,09","durata":"NESSUNA SCAD.","pagamento":"RID/BOLLETTINO","switch":"SI"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('6c128802-89e8-479f-8eb3-0b2096d9b771', 'ENERGY', 'ITALIA POWER', 'PSV 19 BUSINESS', 'business', '24,9', '', '', '', '', '', true, 260, '{"fornitura":"GAS","tipologia":"BUSINESS","tipo_offerta":"VARIABILE","f1":"PSV+0,09","pcv":"24,9","pagamento":"RID/BOLLETTINO"}'::jsonb)
    `);

    // ────────────────────────────────────────────────────────────
    // WINDTRE
    // ────────────────────────────────────────────────────────────
    // ── LUCE ──
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('f00c9ec1-d9f2-4187-b52c-29df826a1d0d', 'ENERGY', 'WINDTRE', 'NEW START CASA', 'consumer', '7,50 (CLT W3)/13', '', '24 MESI', '', '', '', true, 270, '{"fornitura":"LUCE","tipologia":"CONSUMER","tipo_offerta":"VARIABILE","f1":"PUN+0,027","pcv":"7,50 (CLT W3)/13","durata":"24 MESI","pagamento":"RID/BOLLETTINO","cauzione_bolletta":"SI BP","fatturazione":"MENSILE","switch":"SI","subentro":"NO"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('4cd44bff-25df-48aa-a57a-7819c177d3f8', 'ENERGY', 'WINDTRE', 'NEW START PRO', 'business', '9,50 (CLT W3)/17,50', '', '24 MESI', '', '', '', true, 280, '{"fornitura":"LUCE","tipologia":"BUSINESS","tipo_offerta":"VARIABILE","f1":"PUN+0,027","pcv":"9,50 (CLT W3)/17,50","durata":"24 MESI","pagamento":"RID/BOLLETTINO","cauzione_bolletta":"SI  BP","fatturazione":"MENSILE","switch":"SI","subentro":"NO"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('6bf9a7f8-21c7-4910-9a6a-f10d07f203b6', 'ENERGY', 'WINDTRE', 'FLEX', 'consumer', '8 (CLT) /13', '', '24 MESI', '', '', '', true, 290, '{"fornitura":"LUCE","tipologia":"CONSUMER","tipo_offerta":"VARIABILE","f1":"PUN+ 0,025","pcv":"8 (CLT) /13","durata":"24 MESI","pagamento":"RID","fatturazione":"MENSILE","switch":"SI","subentro":"SI","note_condizioni":"RID ANCHE INTESTATARIO DIFFERENTE"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('837c7dbc-e0eb-4dd8-a977-ca486fa611f9', 'ENERGY', 'WINDTRE', 'BUSINESS FLEX', 'business', '5 (CLT) /20', '', '24 MESI', '', '', '', true, 300, '{"fornitura":"LUCE","tipologia":"BUSINESS","tipo_offerta":"VARIABILE","f1":"PUN+ 0,037","pcv":"5 (CLT) /20","durata":"24 MESI","pagamento":"RID","fatturazione":"MENSILE","switch":"SI","subentro":"SI","note_condizioni":"RID ANCHEINTESTATARIO DIFFERENTE"}'::jsonb)
    `);

    // ── GAS ──
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('80171ac8-03b4-4147-9c19-9126adc2b06b', 'ENERGY', 'WINDTRE', 'NEW START CASA', 'consumer', '7,50 (CLT W3)/13', '', '24 MESI', '', '', '', true, 310, '{"fornitura":"GAS","tipologia":"CONSUMER","tipo_offerta":"VARIABILE","f1":"PSV+0,09","pcv":"7,50 (CLT W3)/13","durata":"24 MESI","pagamento":"RID/BOLLETTINO","cauzione_bolletta":"SI  BP","fatturazione":"MENSILE","switch":"SI","subentro":"NO"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('32cf93b5-148a-4219-9474-9858a6798280', 'ENERGY', 'WINDTRE', 'NEW START PRO', 'business', '9,50 (CLT W3)/17,50', '', '24 MESI', '', '', '', true, 320, '{"fornitura":"GAS","tipologia":"BUSINESS","tipo_offerta":"VARIABILE","f1":"PSV+0,09","pcv":"9,50 (CLT W3)/17,50","durata":"24 MESI","pagamento":"RID/BOLLETTINO","cauzione_bolletta":"SI BP","fatturazione":"MENSILE","switch":"SI","subentro":"NO"}'::jsonb)
    `);

    // ────────────────────────────────────────────────────────────
    // ACEA
    // ────────────────────────────────────────────────────────────
    // ── LUCE ──
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('ebd92c80-cd02-42e0-8c58-76f47bd0cf16', 'ENERGY', 'ACEA', 'ACEA FIX', 'consumer', '12', '', '12 MESI', '', '', '', true, 330, '{"fornitura":"LUCE","tipologia":"CONSUMER","tipo_offerta":"FISSO","f1":"0,181","pcv":"12","durata":"12 MESI","pagamento":"RID/BOLLETTINO","cauzione_bolletta":"NO","fatturazione":"MENSILE","switch":"SI","subentro":"NO","note_condizioni":"RID ANCHE CON INTESTATARIO DIFFERENTE"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('9419f685-2bf4-405f-a880-8a5594a0d45b', 'ENERGY', 'ACEA', 'ACEA SPRINT LUCE', 'consumer', '10', '', '12 MESI', '', '', '', true, 340, '{"fornitura":"LUCE","tipologia":"CONSUMER","tipo_offerta":"VARIABILE","f1":"PUN+0,142","pcv":"10","durata":"12 MESI","pagamento":"RID/BOLLETTINO","fatturazione":"MENSILE","switch":"SI","subentro":"SI","note_condizioni":"RID ANCHE CON INTESTATARIO DIFFERENTE"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('9b351f79-cfaf-4eba-ad4c-2befdffb5651', 'ENERGY', 'ACEA', 'ACEA FLEX', 'consumer', '9', '', '12 MESI', '', '', '', true, 350, '{"fornitura":"LUCE","tipologia":"CONSUMER","tipo_offerta":"VARIABILE","f1":"PUN+ 0,03","pcv":"9","durata":"12 MESI","pagamento":"RID/BOLLETTINO","fatturazione":"MENSILE","switch":"SI","subentro":"SI","note_condizioni":"RID ANCHE CON INTESTATARIO DIFFERENTE"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('97bb1d5e-9a53-4087-b45c-023b22801565', 'ENERGY', 'ACEA', 'ACEA SPRINT BUSINESS', 'business', '13', '', '12 MESI', '', '', '', true, 360, '{"fornitura":"LUCE","tipologia":"BUSINESS","tipo_offerta":"VARIABILE","f1":"PUN+  0,016","pcv":"13","durata":"12 MESI","pagamento":"RID/BOLLETTINO","fatturazione":"MENSILE","switch":"SI","subentro":"SI","note_condizioni":"RID ANCHE CON INTESTATARIO DIFFERENTE"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('348f2aa5-6bf4-4b10-83be-dc102e90dd3a', 'ENERGY', 'ACEA', 'START', 'consumer', '30', '', '5 ANNI', '', '', '', true, 370, '{"fornitura":"LUCE","tipologia":"CONSUMER","tipo_offerta":"VARIABILE","f1":"FINO A 800 KWH","pcv":"30","durata":"5 ANNI"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('9aad791d-e3a4-4e52-a6ba-b8a8b27fbb40', 'ENERGY', 'ACEA', 'LIGHT', 'consumer', '45', '', '5 ANNI', '', '', '', true, 380, '{"fornitura":"LUCE","tipologia":"CONSUMER","tipo_offerta":"VARIABILE","f1":"FINO A 1500 KWH","pcv":"45","durata":"5 ANNI"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('97a0af8d-688a-4a25-805a-74c547825fbb', 'ENERGY', 'ACEA', 'PRO', 'consumer', '65', '', '5 ANNI', '', '', '', true, 390, '{"fornitura":"LUCE","tipologia":"CONSUMER","tipo_offerta":"VARIABILE","f1":"FINO A 2500 KWH","pcv":"65","durata":"5 ANNI","pagamento":"RID","fatturazione":"MENSILE","switch":"NO","subentro":"NO","note_condizioni":"RID ANCHE CON INTESTATARIO DIFFERENTE"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('73e3df8b-027e-4d7c-8842-8a16cd0c28fe', 'ENERGY', 'ACEA', 'MAXI', 'consumer', '80', '', '5 ANNI', '', '', '', true, 400, '{"fornitura":"LUCE","tipologia":"CONSUMER","tipo_offerta":"VARIABILE","f1":"FINO A 3500 KWH","pcv":"80","durata":"5 ANNI","pagamento":"RID","fatturazione":"MENSILE","switch":"NO","subentro":"NO","note_condizioni":"RID ANCHE CON INTESTATARIO DIFFERENTE"}'::jsonb)
    `);

    // ── GAS ──
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('188b65f3-9c61-4a8f-8f0c-4824a41f506b', 'ENERGY', 'ACEA', 'ACEA FIX', 'consumer', '12', '', '12 MESI', '', '', '', true, 410, '{"fornitura":"GAS","tipologia":"CONSUMER","tipo_offerta":"FISSO","f1":"FISSO 0,66","pcv":"12","durata":"12 MESI","pagamento":"RID/BOLLETTINO","fatturazione":"MENSILE","switch":"SI","subentro":"SI","note_condizioni":"RID ANCHE CON INTESTATARIO DIFFERENTE"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('bd50377d-1826-487a-be8a-234df7e9979a', 'ENERGY', 'ACEA', 'ACEA SPRINT GAS', 'consumer', '10', '', '12 MESI', '', '', '', true, 420, '{"fornitura":"GAS","tipologia":"CONSUMER","tipo_offerta":"VARIABILE","f1":"PSV+ 0,053","pcv":"10","durata":"12 MESI","pagamento":"RID/BOLLETTINO","fatturazione":"MENSILE","switch":"SI","subentro":"SI","note_condizioni":"RID ANCHE CON INTESTATARIO DIFFERENTE"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('ee173c8d-caaf-4a0c-a391-84aa6fdab5a1', 'ENERGY', 'ACEA', 'ACEA FLEX', 'consumer', '9', '', '12 MESI', '', '', '', true, 430, '{"fornitura":"GAS","tipologia":"CONSUMER","tipo_offerta":"VARIABILE","f1":"PSV+ 0,122","pcv":"9","durata":"12 MESI","pagamento":"RID/BOLLETTINO","fatturazione":"MENSILE","switch":"SI","subentro":"SI","note_condizioni":"RID ANCHE CON INTESTATARIO DIFFERENTE"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('8a390038-ccf7-40f9-9bda-36ef7c3d9e3c', 'ENERGY', 'ACEA', 'ACEA SPRINT BUSINESS', 'business', '13', '', '12 MESI', '', '', '', true, 440, '{"fornitura":"GAS","tipologia":"BUSINESS","tipo_offerta":"VARIABILE","f1":"PSV+ 0,056","pcv":"13","durata":"12 MESI","pagamento":"RID/BOLLETTINO","fatturazione":"MENSILE","switch":"SI","subentro":"SI","note_condizioni":"RID ANCHE CON INTESTATARIO DIFFERENTE"}'::jsonb)
    `);

    // ────────────────────────────────────────────────────────────
    // FASTWEB
    // ────────────────────────────────────────────────────────────
    // ── LUCE ──
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('f83d47b9-4fc8-4148-b709-69c1f628f8ec', 'ENERGY', 'FASTWEB', 'ULTRA', 'consumer', '95', '', '5 ANNI', '', '', '', true, 450, '{"fornitura":"LUCE","tipologia":"CONSUMER","tipo_offerta":"VARIABILE","f1":"FINO A 4500 KWH","pcv":"95","durata":"5 ANNI","pagamento":"RID","fatturazione":"MENSILE","switch":"NO","subentro":"NO","note_condizioni":"RID ANCHE CON INTESTATARIO DIFFERENTE"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('fc22093e-70e1-4cea-8a8d-bee5d964e8be', 'ENERGY', 'FASTWEB', 'FIX', 'consumer', '8/13', '', '12 MESI', '', '', '', true, 460, '{"fornitura":"LUCE","tipologia":"CONSUMER","tipo_offerta":"FISSO","f1":"0,18","pcv":"8/13","durata":"12 MESI","pagamento":"RID","fatturazione":"MENSILE","switch":"\""}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('f42a791b-0f0c-4e5c-8024-5ebf93f98c1f', 'ENERGY', 'FASTWEB', 'FLEX', 'consumer', '8/13', '', '12MESI', '', '', '', true, 470, '{"fornitura":"LUCE","tipologia":"CONSUMER","tipo_offerta":"VARIABILE","f1":"PUN+0,026","pcv":"8/13","durata":"12MESI","pagamento":"RID","fatturazione":"MENSILE","switch":"SI","subentro":"SI","note_condizioni":"RID ANCHE CON INTESTATARIO DIFFERENTE"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('a65ab760-d033-4ac8-b5cb-91e2be9b6d0d', 'ENERGY', 'FASTWEB', 'FIX', 'business', '10/20', '', '12 MESI', '', '', '', true, 480, '{"fornitura":"LUCE","tipologia":"BUSINESS","tipo_offerta":"FISSO","f1":"0,16","pcv":"10/20","durata":"12 MESI","pagamento":"RID","fatturazione":"MENSILE","switch":"NO","subentro":"NO","note_condizioni":"RID ANCHE CON INTESTATARIO DIFFERENTE"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('8c967af8-813e-4b64-9f96-4b4420ea7976', 'ENERGY', 'FASTWEB', 'FLEX', 'business', '10/20', '', '12 MESI', '', '', '', true, 490, '{"fornitura":"LUCE","tipologia":"BUSINESS","tipo_offerta":"VARIABILE","f1":"PUN+0,030","pcv":"10/20","durata":"12 MESI","pagamento":"RID","fatturazione":"MENSILE","switch":"SI","subentro":"SI","note_condizioni":"RID ANCHE CON INTESTATARIO DIFFERENTE"}'::jsonb)
    `);

    // ────────────────────────────────────────────────────────────
    // A2A
    // ────────────────────────────────────────────────────────────
    // ── LUCE ──
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('b0904c4b-21c4-46c0-9b53-f6f9aa3d310d', 'ENERGY', 'A2A', 'SMART CASA', 'consumer', '9,5', '', '12 MESI', '', '', '', true, 500, '{"fornitura":"LUCE","tipologia":"CONSUMER","tipo_offerta":"VARIABILE","f1":"PUN+ 0,025","pcv":"9,5","durata":"12 MESI","pagamento":"RID/BOLLETTINO","cauzione_bolletta":"€5,20 PER KW","fatturazione":"BIMESTRALE","switch":"SI","subentro":"SI"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('7a322d2c-a66b-45dd-be21-de0c39581c67', 'ENERGY', 'A2A', 'ESCLUSIVA 2 A', 'consumer', '9,5', '', '12 MESI', '', '', '', true, 510, '{"fornitura":"LUCE","tipologia":"CONSUMER","tipo_offerta":"VARIABILE","f1":"FISSO 0,139","pcv":"9,5","durata":"12 MESI","pagamento":"RID/BOLLETTINO","cauzione_bolletta":"€5,20 PER KW","fatturazione":"BIMESTRALE","switch":"NO","subentro":"NO"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('7a58606b-dd46-4c2b-8c17-0f26fee1c878', 'ENERGY', 'A2A', 'A2A START', 'consumer', '9,5', '', '12 MESI', '', '', '', true, 520, '{"fornitura":"LUCE","tipologia":"CONSUMER","tipo_offerta":"VARIABILE","f1":"FISSO 0,134","pcv":"9,5","durata":"12 MESI","pagamento":"RID/BOLLETTINO","cauzione_bolletta":"€5,20 PER KW","fatturazione":"BIMESTRALE","switch":"SI","subentro":"SI"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('53083386-a7d3-4e53-acae-432c46037793', 'ENERGY', 'A2A', 'NOI 2', 'consumer', '9,5', '', '', '', '', '', true, 530, '{"fornitura":"LUCE","tipologia":"CONSUMER","tipo_offerta":"VARIABILE","f1":"0,105 +0,020","pcv":"9,5","pagamento":"RID/BOLLETTINO","fatturazione":"BIMESTRALE"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('1b6230f7-a2e5-440f-83fc-662e11d5a4cd', 'ENERGY', 'A2A', 'SMART LUCE BUSINESS', 'business', '15', '', '12 MESI', '', '', '', true, 540, '{"fornitura":"LUCE","tipologia":"BUSINESS","tipo_offerta":"VARIABILE","f1":"PUN+0,20","pcv":"15","durata":"12 MESI","pagamento":"RID/BOLLETTINO","fatturazione":"BIMESTRALE"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('506ca80d-bcdf-4907-a627-f75ef8b09099', 'ENERGY', 'A2A', 'ESCLUSIVA A2A BUSINESS', 'business', '15', '', '12 MESI', '', '', '', true, 550, '{"fornitura":"LUCE","tipologia":"BUSINESS","tipo_offerta":"VARIABILE","f1":"FISSO 0,152","pcv":"15","durata":"12 MESI","pagamento":"RID/BOLLETTINO","fatturazione":"BIMESTRALE"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('a33dea07-e27a-4828-968e-41896a970db7', 'ENERGY', 'A2A', 'PREZZO SICURO BUSINESS', 'business', '15', '', '24 MESI', '', '', '', true, 560, '{"fornitura":"LUCE","tipologia":"BUSINESS","tipo_offerta":"VARIABILE","f1":"FISSO 0,147","pcv":"15","durata":"24 MESI","pagamento":"RID/BOLLETTINO","fatturazione":"BIMESTRALE"}'::jsonb)
    `);

    // ── GAS ──
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('e5050f3b-9714-42e3-947c-cfa5cfcabf86', 'ENERGY', 'A2A', 'SMART CASA', 'consumer', '9,5', '', '12 MESI', '', '', '', true, 570, '{"fornitura":"GAS","tipologia":"CONSUMER","tipo_offerta":"VARIABILE","f1":"PSV+0,12","pcv":"9,5","durata":"12 MESI","pagamento":"RID/BOLLETTINO","cauzione_bolletta":"€5,20 PER KW","fatturazione":"BIMESTRALE","switch":"NO","subentro":"NO"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('bcbee47b-b816-448f-914b-21c3d2876787', 'ENERGY', 'A2A', 'ESCLUSIVA A2A', 'consumer', '9,5', '', '12 MESI', '', '', '', true, 580, '{"fornitura":"GAS","tipologia":"CONSUMER","tipo_offerta":"VARIABILE","f1":"FISSO 0,44","pcv":"9,5","durata":"12 MESI","pagamento":"RID/BOLLETTINO","fatturazione":"BIMESTRALE","switch":"SI"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('079a74c5-ad69-417f-9a9f-82076285f276', 'ENERGY', 'A2A', 'A2A START', 'consumer', '9,5', '', '24 MESI', '', '', '', true, 590, '{"fornitura":"GAS","tipologia":"CONSUMER","tipo_offerta":"VARIABILE","f1":"FISSO 0,40","pcv":"9,5","durata":"24 MESI","pagamento":"RID/BOLLETTINO","fatturazione":"BIMESTRALE","switch":"NO"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('6ae1c893-39dc-483c-98ec-44f330d38394', 'ENERGY', 'A2A', 'SMART BUSINESS', 'business', '15', '', '12 MESI', '', '', '', true, 600, '{"fornitura":"GAS","tipologia":"BUSINESS","tipo_offerta":"VARIABILE","f1":"PSV+,011","pcv":"15","durata":"12 MESI","pagamento":"RID/BOLLETTINO","fatturazione":"BIMESTRALE"}'::jsonb)
    `);
    await queryRunner.query(`
      INSERT INTO offers (id, category, provider, name, type, canone, attivazione, vincolo, scadenza, note, disattivazione, is_active, sort_order, details)
      VALUES ('e54b6880-4334-4982-b2f6-7153505ef6dc', 'ENERGY', 'A2A', 'PREZZO SICURO BUSINESS', 'business', '15', '', '24 MESI', '', '', '', true, 610, '{"fornitura":"GAS","tipologia":"BUSINESS","tipo_offerta":"VARIABILE","f1":"FISSO 0,43","pcv":"15","durata":"24 MESI","pagamento":"RID/BOLLETTINO","fatturazione":"BIMESTRALE"}'::jsonb)
    `);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ============================================================
    // ROLLBACK: cancella tutte le offerte ENERGY inserite da questa migration
    // ============================================================
    await queryRunner.query(`DELETE FROM offers WHERE id IN ('3244d642-5cbb-4474-a62a-ec54d50efa30', '5054a646-fcfe-45a3-a838-5f2ebdd6009c', '84b22bea-2eaf-4779-8aa8-34af1085ac1e', 'bce72ad0-dfe8-47ca-94e4-a10c8eb0b71c', '6331cc40-f9f4-4c59-a421-ea7a2461ecad', '04609217-6af6-45e4-9c6f-328cde779fee', 'cf085fab-1429-47ec-926f-0e00fbbbc667', 'bd8d647d-119a-4701-b7ae-d3dae7f08d0c', '09c0b9ee-9bc0-4bd3-a9ea-85aa324e8538', 'd51c3bd5-b9b3-4db9-852f-edcbe592a874')`);
    await queryRunner.query(`DELETE FROM offers WHERE id IN ('2197d2be-f084-4b56-a36c-ad3230122628', 'c87ef672-c3c6-4517-b89f-6eab27a766a5', '015fab80-c2bb-457d-b058-4f3bf7cb7163', 'f20886e7-28c8-4e7c-a7eb-21458bb4e9ef', '7dfaf664-a643-40ac-8067-435203c8eb50', '89eabf3b-4b48-4167-8ed6-22abfb4bfde8', '0f8e845c-be5d-4c7a-9605-032126fcbaa5', '384c88c3-2409-4bda-8099-f24fe33a8be4', 'a4021851-668c-491f-a87f-69f4cceb4de0', 'ae54a59f-ec6d-4918-8612-679e37126bf7')`);
    await queryRunner.query(`DELETE FROM offers WHERE id IN ('b98bfe57-0165-4b2c-82d8-90dd013f9d8e', '4751f083-e974-49b7-b4dd-c2312bbe0fbe', 'cb301fc0-c31b-402c-9a68-3eb9dc9d6302', 'c58f4144-ef73-4f54-b806-b51a55ea2e91', '5af6ed8c-8e69-43e9-ad83-f690cbc073be', '6c128802-89e8-479f-8eb3-0b2096d9b771', 'f00c9ec1-d9f2-4187-b52c-29df826a1d0d', '80171ac8-03b4-4147-9c19-9126adc2b06b', '4cd44bff-25df-48aa-a57a-7819c177d3f8', '32cf93b5-148a-4219-9474-9858a6798280')`);
    await queryRunner.query(`DELETE FROM offers WHERE id IN ('6bf9a7f8-21c7-4910-9a6a-f10d07f203b6', '837c7dbc-e0eb-4dd8-a977-ca486fa611f9', 'ebd92c80-cd02-42e0-8c58-76f47bd0cf16', '188b65f3-9c61-4a8f-8f0c-4824a41f506b', '9419f685-2bf4-405f-a880-8a5594a0d45b', 'bd50377d-1826-487a-be8a-234df7e9979a', '9b351f79-cfaf-4eba-ad4c-2befdffb5651', 'ee173c8d-caaf-4a0c-a391-84aa6fdab5a1', '97bb1d5e-9a53-4087-b45c-023b22801565', '8a390038-ccf7-40f9-9bda-36ef7c3d9e3c')`);
    await queryRunner.query(`DELETE FROM offers WHERE id IN ('348f2aa5-6bf4-4b10-83be-dc102e90dd3a', '9aad791d-e3a4-4e52-a6ba-b8a8b27fbb40', '97a0af8d-688a-4a25-805a-74c547825fbb', '73e3df8b-027e-4d7c-8842-8a16cd0c28fe', 'f83d47b9-4fc8-4148-b709-69c1f628f8ec', 'fc22093e-70e1-4cea-8a8d-bee5d964e8be', 'f42a791b-0f0c-4e5c-8024-5ebf93f98c1f', 'a65ab760-d033-4ac8-b5cb-91e2be9b6d0d', '8c967af8-813e-4b64-9f96-4b4420ea7976', 'b0904c4b-21c4-46c0-9b53-f6f9aa3d310d')`);
    await queryRunner.query(`DELETE FROM offers WHERE id IN ('7a322d2c-a66b-45dd-be21-de0c39581c67', '7a58606b-dd46-4c2b-8c17-0f26fee1c878', 'e5050f3b-9714-42e3-947c-cfa5cfcabf86', 'bcbee47b-b816-448f-914b-21c3d2876787', '079a74c5-ad69-417f-9a9f-82076285f276', '53083386-a7d3-4e53-acae-432c46037793', '1b6230f7-a2e5-440f-83fc-662e11d5a4cd', '506ca80d-bcdf-4907-a627-f75ef8b09099', 'a33dea07-e27a-4828-968e-41896a970db7', '6ae1c893-39dc-483c-98ec-44f330d38394')`);
    await queryRunner.query(`DELETE FROM offers WHERE id IN ('e54b6880-4334-4982-b2f6-7153505ef6dc')`);
  }
}b65f3-9c61-4a8f-8f0c-4824a41f506b', '9419f685-2bf4-405f-a880-8a5594a0d45b', 'bd50377d-1826-487a-be8a-234df7e9979a', '9b351f79-cfaf-4eba-ad4c-2befdffb5651', 'ee173c8d-caaf-4a0c-a391-84aa6fdab5a1', '97bb1d5e-9a53-4087-b45c-023b22801565', '8a390038-ccf7-40f9-9bda-36ef7c3d9e3c')`);
    await queryRunner.query(`DELETE FROM offers WHERE id IN ('348f2aa5-6bf4-4b10-83be-dc102e90dd3a', '9aad791d-e3a4-4e52-a6ba-b8a8b27fbb40', '97a0af8d-688a-4a25-805a-74c547825fbb', '73e3df8b-027e-4d7c-8842-8a16cd0c28fe', 'f83d47b9-4fc8-4148-b709-69c1f628f8ec', 'fc22093e-70e1-4cea-8a8d-bee5d964e8be', 'f9ad43d9-ab91-467c-aa7d-798f6f090109', 'f42a791b-0f0c-4e5c-8024-5ebf93f98c1f', 'a65ab760-d033-4ac8-b5cb-91e2be9b6d0d', '8c967af8-813e-4b64-9f96-4b4420ea7976')`);
    await queryRunner.query(`DELETE FROM offers WHERE id IN ('b0904c4b-21c4-46c0-9b53-f6f9aa3d310d', '7a322d2c-a66b-45dd-be21-de0c39581c67', '7a58606b-dd46-4c2b-8c17-0f26fee1c878', 'e5050f3b-9714-42e3-947c-cfa5cfcabf86', 'bcbee47b-b816-448f-914b-21c3d2876787', '079a74c5-ad69-417f-9a9f-82076285f276', '53083386-a7d3-4e53-acae-432c46037793', '1b6230f7-a2e5-440f-83fc-662e11d5a4cd', '506ca80d-bcdf-4907-a627-f75ef8b09099', 'a33dea07-e27a-4828-968e-41896a970db7')`);
    await queryRunner.query(`DELETE FROM offers WHERE id IN ('6ae1c893-39dc-483c-98ec-44f330d38394', 'e54b6880-4334-4982-b2f6-7153505ef6dc')`);
  }
}