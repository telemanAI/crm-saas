import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration 1715000000003 - InsertEnergyOffers
 *
 * Inserisce tutte le offerte ENERGY (luce/gas) dal file Excel.
 * Idempotente: controlla name+provider+category prima di inserire.
 * Totale offerte: 63 (OPTIMA 6, IREN 12, ITALIA POWER 8, WINDTRE 6,
 * ACEA 14, FASTWEB 5, A2A 12).
 */
export class InsertEnergyOffers1715000000003 implements MigrationInterface {
  name = "InsertEnergyOffers1715000000003";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const offers = [
      { id: "28fe80e8-5b8c-456e-a633-162d8254e77d", provider: "OPTIMA", name: "SUPER CASA SMART LUCE", canone: "0,22 €/kWh", vincolo: "12 mesi", type: "consumer", scadenza: null, note: "FISSO. PCV: 12. Pagamento: RID. Cauzione: 20€ PER KW. Fatturazione: mensile. Switch: SI. Subentro: NO." },
      { id: "7d41abdc-b33b-47e8-9efe-e871d0228958", provider: "OPTIMA", name: "SUPER CASA SMART LUCE (MISTA)", canone: "60% VARIABILE PUN +0,044 (INCLUSE PERDITE DI RETE) / 40% FISSA 0,195 KWH", vincolo: "9 mesi poi 12 mesi poi passa a variabile", type: "consumer", scadenza: null, note: "MISTA. PCV: 9. Pagamento: RID. Fatturazione: mensile." },
      { id: "eb11ab58-735d-44ca-8316-af32dc2bd24a", provider: "OPTIMA", name: "SUPER CASA SMART LUCE (VARIABILE)", canone: "PUN + 0,080", vincolo: "NESSUNA SCAD.", type: "consumer", scadenza: null, note: "VARIABILE. PCV: 9. Pagamento: RID. Cauzione: 20€ PER KW. Fatturazione: mensile. Switch: SI. Subentro: NO. NOTA: solo RID bancario/postale, no ricaricabili." },
      { id: "d51a84dd-b13f-4fda-8f53-6c30cb11e26e", provider: "OPTIMA", name: "SUPER CASA SMART GAS", canone: "PSV + 0,200", vincolo: "NESSUNA SCAD.", type: "consumer", scadenza: null, note: "VARIABILE. PCV: 8,9. Pagamento: RID. Fatturazione: mensile. Switch: NO. Subentro: SI. NOTA: solo RID bancario/postale, no ricaricabili." },
      { id: "ee3d78f1-c584-4402-8733-b6834f2dc6f3", provider: "OPTIMA", name: "SUPER IMPRESA SMART LUCE", canone: "PUN + 0,02", vincolo: "NESSUNA SCAD.", type: "business", scadenza: null, note: "VARIABILE. PCV: 17,5. Pagamento: RID. Fatturazione: mensile. Switch: NO. Subentro: SI." },
      { id: "3fa275cf-398d-4876-b24d-8f77a8402a59", provider: "OPTIMA", name: "SUPER IMPRESA SMART GAS", canone: "PSV + 0,15", vincolo: "NESSUNA SCAD.", type: "business", scadenza: null, note: "VARIABILE. PCV: 20. Pagamento: RID. Fatturazione: mensile. Switch: NO. Subentro: SI." },
      { id: "fbd08c4e-a91b-496a-aa16-6685bda9ef1a", provider: "IREN", name: "IREN SOTTO CASA LUCE", canone: "0,134", vincolo: "12 mesi", type: "consumer", scadenza: null, note: "FISSO. PCV: 13,25. Pagamento: RID/BOLLETTINO. Cauzione: NO. Fatturazione: bimestrale. Switch: SI. Subentro: NO." },
      { id: "4b643f04-12fc-471c-932d-42288fcd5940", provider: "IREN", name: "IREN SOTTO CASA GAS", canone: "0,56", vincolo: "12 mesi", type: "consumer", scadenza: null, note: "FISSO. PCV: 13. Pagamento: RID/BOLLETTINO. Cauzione: NO. Fatturazione: bimestrale. Switch: NO. Subentro: NO." },
      { id: "016f4374-c28a-4e07-bbef-0f6c82b80c0a", provider: "IREN", name: "SEV IREN QUICK LUCE", canone: "0,135 (INCLUSE PERDITE DI RETE)", vincolo: "12 mesi", type: "consumer", scadenza: "20 marzo", note: "FISSO. PCV: 11,25. Pagamento: RID/BOLLETTINO. Cauzione: NO." },
      { id: "4f21d38b-51cc-4808-a94c-32f6e38e4b2d", provider: "IREN", name: "SEV IREN QUICK GAS", canone: "0,57", vincolo: "12 mesi", type: "consumer", scadenza: "20 marzo", note: "FISSO. PCV: 11. Pagamento: RID/BOLLETTINO. Cauzione: NO." },
      { id: "8bdafacd-8ea4-43f5-baf0-4f0637ca52ff", provider: "IREN", name: "IREN TUA AZIENDA LUCE", canone: "0,172", vincolo: null, type: "business", scadenza: null, note: "FISSO. PCV: 15. Pagamento: RID/BOLLETTINO. Switch: SI. Subentro: NO." },
      { id: "274748bf-3b5a-424b-8a9e-e0be9316ac6a", provider: "IREN", name: "IREN TUA AZIENDA GAS", canone: "0,688", vincolo: null, type: "business", scadenza: null, note: "FISSO. PCV: 15. Pagamento: RID/BOLLETTINO." },
      { id: "28e0941e-e963-4a71-99d0-e6b3d9b41b67", provider: "IREN", name: "SEV BONUS 60 LUCE GREEN", canone: "PUN + 0,015", vincolo: "12 mesi", type: "consumer", scadenza: null, note: "VARIABILE. PCV: 7. Pagamento: RID/BOLLETTINO. Cauzione: NO. Fatturazione: bimestrale. Switch: SI. Subentro: SI." },
      { id: "9a269c6d-4c14-4779-97fb-ec4f8cbe0091", provider: "IREN", name: "SEV BONUS 60 GAS GREEN", canone: "PSV + 0,15", vincolo: "12 mesi", type: "consumer", scadenza: null, note: "VARIABILE. PCV: 7. Pagamento: RID/BOLLETTINO. Cauzione: NO. Switch: SI. Subentro: SI." },
      { id: "b5ecf748-6676-4484-8afc-ab8d2961f9c2", provider: "IREN", name: "SEV FULL ENERGY LUCE SPECIAL EDITION", canone: "0,15", vincolo: "12 mesi", type: "consumer", scadenza: null, note: "FISSO. PCV: 11,5. Pagamento: RID/BOLLETTINO. Cauzione: NO. Fatturazione: bimestrale. Switch: SI. Subentro: SI." },
      { id: "7803f7dc-794a-4fad-8809-cb334d9ff488", provider: "IREN", name: "SEV FULL ENERGY GAS SPECIAL EDITION", canone: "0,61", vincolo: "12 mesi", type: "consumer", scadenza: null, note: "FISSO. PCV: 11,5. Pagamento: RID/BOLLETTINO. Cauzione: NO. Fatturazione: bimestrale. Switch: SI. Subentro: SI." },
      { id: "d721e2f2-e922-4c2d-8504-6dee21af3ec1", provider: "IREN", name: "SEV FULL ENERGY LUCE (CONV FIBRA)", canone: "PUN + 0,045", vincolo: "NESSUNA SCAD.", type: "consumer", scadenza: null, note: "VARIABILE. PCV: 12. Pagamento: RID/BOLLETTINO. Cauzione: NO. Fatturazione: bimestrale. Switch: SI. Subentro: SI." },
      { id: "7f8c1831-b257-4418-8439-7a0a4fb8f799", provider: "IREN", name: "SEV FULL ENERGY GAS (CONV FIBRA)", canone: "PSV + 0,20", vincolo: "NESSUNA SCAD.", type: "consumer", scadenza: null, note: "VARIABILE. PCV: 12. Pagamento: RID/BOLLETTINO. Cauzione: NO. Fatturazione: bimestrale. Switch: SI. Subentro: SI." },
      { id: "f40d957a-aa10-4e28-8465-04b8295f11ed", provider: "ITALIA POWER", name: "MONETITO FIX LUCE", canone: "0,139", vincolo: "12 mesi", type: "consumer", scadenza: "31/03", note: "FISSO. PCV: 13,5." },
      { id: "ae8f5df0-5e11-4984-bf78-255bb5a43693", provider: "ITALIA POWER", name: "MONETITO FIX GAS", canone: "0,49", vincolo: "12 mesi", type: "consumer", scadenza: "31/03", note: "FISSO. PCV: 11,9." },
      { id: "1143cb6e-b02c-4b1d-8ecb-327a1410574e", provider: "ITALIA POWER", name: "PUN ZERO", canone: "PUN + 0", vincolo: "NESSUNA SCAD.", type: "consumer", scadenza: null, note: "VARIABILE. PCV: 13,5. NOTA: DA OGGI se il cliente attiva DUAL LUCE+GAS ha diritto all'ASSICURAZIONE RC CASA INCLUSA. Pagamento: RID/BOLLETTINO. Fatturazione: mensile/bimestrale. Switch: SI." },
      { id: "841aa672-0137-4aad-8d3c-9e62591035d7", provider: "ITALIA POWER", name: "PSV Day Ahead (DA) + 0,09", canone: "PSV + 0,09", vincolo: "NESSUNA SCAD.", type: "consumer", scadenza: null, note: "VARIABILE. PCV: 12,9. Pagamento: RID/BOLLETTINO. Switch: SI." },
      { id: "8c0cf4eb-d2f4-42a3-b866-8438830c7e3c", provider: "ITALIA POWER", name: "SUMMER LUCE", canone: "PUN + 0,019", vincolo: "NESSUNA SCAD.", type: "consumer", scadenza: null, note: "VARIABILE. PCV: 9,5. Pagamento: RID/BOLLETTINO. Switch: SI." },
      { id: "87a9e90e-ee2b-4eb8-bc37-49e7d997d0cd", provider: "ITALIA POWER", name: "MONETITO ALTRI USI MONO (SCALE/GARAGE CON CF.)", canone: "PUN+ 0,019", vincolo: "NESSUNA SCAD.", type: "business", scadenza: null, note: "VARIABILE. PCV: 13,5. Pagamento: RID/BOLLETTINO." },
      { id: "edb3b028-55fe-4d09-9bfe-53c06abe8419", provider: "ITALIA POWER", name: "SMART BUSINESS LUCE", canone: "PUN+0,019", vincolo: "NESSUNA SCAD.", type: "business", scadenza: null, note: "VARIABILE. PCV: 12,9. Pagamento: RID/BOLLETTINO. Switch: NO." },
      { id: "b278f1db-aef5-4595-9916-2c5334246c4d", provider: "ITALIA POWER", name: "PSV 19 BUSINESS", canone: "PSV+0,09", vincolo: null, type: "business", scadenza: null, note: "VARIABILE. PCV: 24,9. Pagamento: RID/BOLLETTINO." },
      { id: "29896b9b-afb9-4d5c-9398-dffa05c2de8f", provider: "WINDTRE", name: "NEW START CASA LUCE", canone: "PUN+0,027", vincolo: "24 mesi", type: "consumer", scadenza: null, note: "VARIABILE. PCV: 7,50 (CLT W3)/13. Pagamento: RID/BOLLETTINO. Cauzione: SI BP. Fatturazione: mensile. Switch: SI. Subentro: NO." },
      { id: "3bd85f50-023a-45c8-bc79-ed87267e04b2", provider: "WINDTRE", name: "NEW START CASA GAS", canone: "PSV+0,09", vincolo: "24 mesi", type: "consumer", scadenza: null, note: "VARIABILE. PCV: 7,50 (CLT W3)/13. Pagamento: RID/BOLLETTINO. Cauzione: SI BP. Fatturazione: mensile. Switch: SI. Subentro: NO." },
      { id: "03bfb2b3-3723-4480-8429-e6c43e7bc072", provider: "WINDTRE", name: "NEW START PRO LUCE", canone: "PUN+0,027", vincolo: "24 mesi", type: "business", scadenza: null, note: "VARIABILE. PCV: 9,50 (CLT W3)/17,50. Pagamento: RID/BOLLETTINO. Cauzione: SI BP. Fatturazione: mensile. Switch: SI. Subentro: NO." },
      { id: "9f347381-cedc-4c87-ae3a-76a5ece66ed6", provider: "WINDTRE", name: "NEW START PRO GAS", canone: "PSV+0,09", vincolo: "24 mesi", type: "business", scadenza: null, note: "VARIABILE. PCV: 9,50 (CLT W3)/17,50. Pagamento: RID/BOLLETTINO. Cauzione: SI BP. Fatturazione: mensile. Switch: SI. Subentro: NO." },
      { id: "8993da1c-cff3-485e-bc6a-834e42dee0c0", provider: "WINDTRE", name: "FLEX LUCE", canone: "PUN+ 0,025", vincolo: "24 mesi", type: "consumer", scadenza: null, note: "VARIABILE. PCV: 8 (CLT)/13. Pagamento: RID. Fatturazione: mensile. Switch: SI. Subentro: SI. NOTA: RID anche intestatario differente." },
      { id: "22078f26-da33-42c5-90a9-74f05c960771", provider: "WINDTRE", name: "BUSINESS FLEX LUCE", canone: "PUN+ 0,037", vincolo: "24 mesi", type: "business", scadenza: null, note: "VARIABILE. PCV: 5 (CLT)/20. Pagamento: RID. Fatturazione: mensile. Switch: SI. Subentro: SI. NOTA: RID anche intestatario differente." },
      { id: "840815da-688d-4edc-8a30-2eeb50d18b26", provider: "ACEA", name: "ACEA FIX LUCE", canone: "0,181", vincolo: "12 mesi", type: "consumer", scadenza: null, note: "FISSO. PCV: 12. Pagamento: RID/BOLLETTINO. Cauzione: NO. Fatturazione: mensile. Switch: SI. Subentro: NO. NOTA: RID anche con intestatario differente." },
      { id: "00712177-0883-4c71-86d9-e69f762c8d9e", provider: "ACEA", name: "ACEA FIX GAS", canone: "0,66", vincolo: "12 mesi", type: "consumer", scadenza: null, note: "FISSO. PCV: 12. Pagamento: RID/BOLLETTINO. Fatturazione: mensile. Switch: SI. Subentro: SI. NOTA: RID anche con intestatario differente." },
      { id: "1b02f235-7fba-42e6-a0c4-a5b8670e747e", provider: "ACEA", name: "ACEA SPRINT LUCE", canone: "PUN+0,142", vincolo: "12 mesi", type: "consumer", scadenza: null, note: "VARIABILE. PCV: 10. Pagamento: RID/BOLLETTINO. Fatturazione: mensile. Switch: SI. Subentro: SI. NOTA: RID anche con intestatario differente." },
      { id: "3678629e-227d-4855-917e-10674e04cf75", provider: "ACEA", name: "ACEA SPRINT GAS", canone: "PSV+ 0,053", vincolo: "12 mesi", type: "consumer", scadenza: null, note: "VARIABILE. PCV: 10. Pagamento: RID/BOLLETTINO. Fatturazione: mensile. Switch: SI. Subentro: SI. NOTA: RID anche con intestatario differente." },
      { id: "0582868b-7eda-4873-a735-db6c3a06a016", provider: "ACEA", name: "ACEA FLEX LUCE", canone: "PUN+ 0,03", vincolo: "12 mesi", type: "consumer", scadenza: null, note: "VARIABILE. PCV: 9. Pagamento: RID/BOLLETTINO. Fatturazione: mensile. Switch: SI. Subentro: SI. NOTA: RID anche con intestatario differente." },
      { id: "14f87d50-c4aa-440f-bc34-6d4a59e3a739", provider: "ACEA", name: "ACEA FLEX GAS", canone: "PSV+ 0,122", vincolo: "12 mesi", type: "consumer", scadenza: null, note: "VARIABILE. PCV: 9. Pagamento: RID/BOLLETTINO. Fatturazione: mensile. Switch: SI. Subentro: SI. NOTA: RID anche con intestatario differente." },
      { id: "f3df7a55-15b5-4a63-8c98-cb5a1b10dee6", provider: "ACEA", name: "ACEA SPRINT BUSINESS LUCE", canone: "PUN+ 0,016", vincolo: "12 mesi", type: "business", scadenza: null, note: "VARIABILE. PCV: 13. Pagamento: RID/BOLLETTINO. Fatturazione: mensile. Switch: SI. Subentro: SI. NOTA: RID anche con intestatario differente." },
      { id: "8cd02709-ffe1-4949-96da-3826101813dc", provider: "ACEA", name: "ACEA SPRINT BUSINESS GAS", canone: "PSV+ 0,056", vincolo: "12 mesi", type: "business", scadenza: null, note: "VARIABILE. PCV: 13. Pagamento: RID/BOLLETTINO. Fatturazione: mensile. Switch: SI. Subentro: SI. NOTA: RID anche con intestatario differente." },
      { id: "4439c219-38fa-4322-95c6-1b4578562266", provider: "ACEA", name: "START (5 ANNI)", canone: "FINO A 800 KWH", vincolo: "5 anni", type: "consumer", scadenza: null, note: "PCV: 30." },
      { id: "db0f3b4c-7c46-44da-8675-9ba4a0cce349", provider: "ACEA", name: "LIGHT (5 ANNI)", canone: "FINO A 1500 KWH", vincolo: "5 anni", type: "consumer", scadenza: null, note: "PCV: 45." },
      { id: "0ee15e25-c5e8-4f3d-9f7b-2cb18a4d25d5", provider: "ACEA", name: "START", canone: "FINO A 800 KWH", vincolo: null, type: "consumer", scadenza: null, note: "PCV: 30." },
      { id: "9153cdd3-ad71-4640-900b-0d07390c4fc0", provider: "ACEA", name: "LIGHT", canone: "FINO A 1500 KWH", vincolo: null, type: "consumer", scadenza: null, note: "PCV: 45." },
      { id: "fdd69e6e-150d-42ab-b048-f34e409cb5c0", provider: "ACEA", name: "PRO", canone: "FINO A 2500 KWH", vincolo: "5 anni", type: "consumer", scadenza: null, note: "PCV: 65. Pagamento: RID. Fatturazione: mensile. Switch: NO. Subentro: NO. NOTA: RID anche con intestatario differente." },
      { id: "55b12eb9-215c-4288-8a6e-7d5139ae1794", provider: "ACEA", name: "MAXI", canone: "FINO A 3500 KWH", vincolo: "5 anni", type: "consumer", scadenza: null, note: "PCV: 80. Pagamento: RID. Fatturazione: mensile. Switch: NO. Subentro: NO. NOTA: RID anche con intestatario differente." },
      { id: "9114436e-868a-4cde-a87e-77f7c21e01ff", provider: "FASTWEB", name: "ULTRA", canone: "FINO A 4500 KWH", vincolo: "5 anni", type: "consumer", scadenza: null, note: "PCV: 95. Pagamento: RID. Fatturazione: mensile. Switch: NO. Subentro: NO. NOTA: RID anche con intestatario differente." },
      { id: "5bc4c6b1-0e74-4f72-a9c0-ea77ca002a12", provider: "FASTWEB", name: "FIX LUCE", canone: "0,21", vincolo: "12 mesi", type: "consumer", scadenza: null, note: "FISSO. PCV: 8/13. Pagamento: RID. Fatturazione: mensile. Switch: NO. Subentro: NO. NOTA: RID anche con intestatario differente." },
      { id: "6816ac04-abff-4ff5-b346-41f0d87610be", provider: "FASTWEB", name: "FLEX LUCE", canone: "PUN+0,026", vincolo: "12 mesi", type: "consumer", scadenza: null, note: "VARIABILE. PCV: 8/13. Pagamento: RID. Fatturazione: mensile. Switch: SI. Subentro: SI. NOTA: RID anche con intestatario differente." },
      { id: "59cd8107-e581-48b1-ac90-f9cb25d5d9d8", provider: "FASTWEB", name: "FIX BUSINESS LUCE", canone: "0,18", vincolo: "12 mesi", type: "business", scadenza: null, note: "FISSO. PCV: 10/20. Pagamento: RID. Fatturazione: mensile. Switch: NO. Subentro: NO. NOTA: RID anche con intestatario differente." },
      { id: "ebcdd6ef-17fc-4dc3-8b7d-2bbe5c351893", provider: "FASTWEB", name: "FLEX BUSINESS LUCE", canone: "PUN+0,030", vincolo: "12 mesi", type: "business", scadenza: null, note: "VARIABILE. PCV: 10/20. Pagamento: RID. Fatturazione: mensile. Switch: SI. Subentro: SI. NOTA: RID anche con intestatario differente." },
      { id: "5ba6ad54-3bda-4308-ada7-c50b99648c3f", provider: "A2A", name: "SMART CASA LUCE", canone: "PUN+ 0,025", vincolo: "12 mesi", type: "consumer", scadenza: null, note: "VARIABILE. PCV: 9,5. Pagamento: RID/BOLLETTINO. Cauzione: 5,20€ PER KW. Fatturazione: bimestrale. Switch: SI. Subentro: SI." },
      { id: "3bebbe7e-4247-4c64-8d5d-6cfca14b1c4a", provider: "A2A", name: "ESCLUSIVA 2 A LUCE", canone: "FISSO 0,139", vincolo: "12 mesi", type: "consumer", scadenza: null, note: "FISSO. PCV: 9,5. Pagamento: RID/BOLLETTINO. Cauzione: 5,20€ PER KW. Fatturazione: bimestrale. Switch: NO. Subentro: NO." },
      { id: "66966e2a-1be7-4d13-96ca-f58b0df0063e", provider: "A2A", name: "A2A START LUCE", canone: "FISSO 0,134", vincolo: "12 mesi", type: "consumer", scadenza: null, note: "FISSO. PCV: 9,5. Pagamento: RID/BOLLETTINO. Cauzione: 5,20€ PER KW. Fatturazione: bimestrale. Switch: SI. Subentro: SI." },
      { id: "3e2bd13a-f0cf-48c0-8103-e35324dc90db", provider: "A2A", name: "SMART CASA GAS", canone: "PSV+0,12", vincolo: "12 mesi", type: "consumer", scadenza: null, note: "VARIABILE. PCV: 9,5. Pagamento: RID/BOLLETTINO. Cauzione: 5,20€ PER KW. Fatturazione: bimestrale. Switch: NO. Subentro: NO." },
      { id: "e577459e-f195-4a03-9dc3-5d1373843777", provider: "A2A", name: "ESCLUSIVA A2A GAS", canone: "FISSO 0,44", vincolo: "12 mesi", type: "consumer", scadenza: null, note: "FISSO. PCV: 9,5. Pagamento: RID/BOLLETTINO. Fatturazione: bimestrale. Switch: SI." },
      { id: "11f91276-f580-4900-9790-66a5db9ab243", provider: "A2A", name: "A2A START GAS", canone: "FISSO 0,40", vincolo: "24 mesi", type: "consumer", scadenza: null, note: "FISSO. PCV: 9,5. Pagamento: RID/BOLLETTINO. Fatturazione: bimestrale. Switch: NO." },
      { id: "8ea76eb6-0532-4b2c-bb55-5e9281ae2fe9", provider: "A2A", name: "NOI 2", canone: "0,105 +0,020", vincolo: null, type: "consumer", scadenza: null, note: "PCV: 9,5. Pagamento: RID/BOLLETTINO. Fatturazione: bimestrale." },
      { id: "da4988c8-0034-4d48-97fd-a9938506807c", provider: "A2A", name: "SMART LUCE BUSINESS", canone: "PUN+0,20", vincolo: "12 mesi", type: "business", scadenza: null, note: "VARIABILE. PCV: 15. Pagamento: RID/BOLLETTINO. Fatturazione: bimestrale." },
      { id: "f28ee3aa-08ce-44d3-a2c4-30c455a8f3db", provider: "A2A", name: "ESCLUSIVA A2A BUSINESS LUCE", canone: "FISSO 0,152", vincolo: "12 mesi", type: "business", scadenza: null, note: "FISSO. PCV: 15. Pagamento: RID/BOLLETTINO. Fatturazione: bimestrale." },
      { id: "69e72874-9091-4964-beca-4558438958c7", provider: "A2A", name: "PREZZO SICURO BUSINESS LUCE", canone: "FISSO 0,147", vincolo: "24 mesi", type: "business", scadenza: null, note: "FISSO. PCV: 15. Pagamento: RID/BOLLETTINO. Fatturazione: bimestrale." },
      { id: "ff462f9f-af02-4e35-a6e8-a2294322ab69", provider: "A2A", name: "SMART BUSINESS GAS", canone: "PSV+,011", vincolo: "12 mesi", type: "business", scadenza: null, note: "VARIABILE. PCV: 15. Pagamento: RID/BOLLETTINO. Fatturazione: bimestrale." },
      { id: "bc694b92-3d77-415e-b6f9-b2d80ef5469c", provider: "A2A", name: "PREZZO SICURO BUSINESS GAS", canone: "FISSO 0,43", vincolo: "24 mesi", type: "business", scadenza: null, note: "FISSO. PCV: 15. Pagamento: RID/BOLLETTINO. Fatturazione: bimestrale." },
    ];

    for (const o of offers) {
      // Check idempotente: verifica se offerta esiste già
      const existing = await queryRunner.query(
        "SELECT id FROM offers WHERE name = $1 AND provider = $2 AND category = 'ENERGY'",
        [o.name, o.provider]
      );
      if (existing && existing.length > 0) {
        continue; // Offerta già presente, salta
      }

      // Inserisci nuova offerta
      await queryRunner.query(
        "INSERT INTO offers (id, category, provider, name, canone, attivazione, vincolo, note, disattivazione, type, scadenza, is_active, sort_order) " +
        "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)",
        [
          o.id,
          "ENERGY",
          o.provider,
          o.name,
          o.canone,
          null, // attivazione
          o.vincolo,
          o.note,
          null, // disattivazione
          o.type,
          o.scadenza,
          true, // is_active
          0,    // sort_order
        ]
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DELETE FROM offers WHERE category = 'ENERGY';");
  }
}