/**
 * scripts/verify-schema.ts
 *
 * Script di sanity check schema DB ↔ entity TypeORM.
 *
 * Cosa fa:
 *  - Carica la DataSource (legge DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME da .env)
 *  - Per ogni entity, confronta le colonne dichiarate con quelle reali del DB
 *  - Segnala disallineamenti che potrebbero causare errori 23502 silenti come quello
 *    di tenantId/tenant_id (Problema 1) o "tabella non esiste" (Problema 2)
 *
 * Uso:
 *   npm run db:check        # esegue il check
 *   npm run db:check -- --strict   # exit code 1 se trova disallineamenti (per CI)
 *
 * Setup: aggiungi in package.json:
 *   "scripts": {
 *     "db:check": "ts-node scripts/verify-schema.ts"
 *   }
 *
 * Output esempio:
 *   ✅ inventory_items                  OK (16 colonne)
 *   ❌ notifications                    TABELLA NON ESISTE NEL DB
 *   ⚠️  inventory_movements             colonna duplicata: "tenantId" (estranea all'entity)
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

const STRICT = process.argv.includes('--strict');

// ANSI colors per output leggibile in console
const C = {
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

async function main() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'crm_user',
    password: process.env.DB_PASSWORD || 'crm_password',
    database: process.env.DB_NAME || 'crm_db',
    entities: ['src/**/*.entity.ts'],
    synchronize: false,
    logging: false,
  });

  await ds.initialize();
  console.log(C.cyan(C.bold(`\n🔍 Schema check su ${ds.options.database}@${(ds.options as any).host}\n`)));

  let issues = 0;

  for (const meta of ds.entityMetadatas) {
    const tableName = meta.tableName;

    // 1. Tabella esiste?
    const tableExists = await ds.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = $1 AND table_schema = 'public' LIMIT 1`,
      [tableName],
    );
    if (tableExists.length === 0) {
      console.log(`${C.red('❌')} ${tableName.padEnd(35)} ${C.red('TABELLA NON ESISTE NEL DB')}`);
      issues++;
      continue;
    }

    // 2. Colonne reali nel DB
    const dbCols: Array<{ column_name: string; is_nullable: string; data_type: string }> =
      await ds.query(
        `SELECT column_name, is_nullable, data_type
         FROM information_schema.columns
         WHERE table_name = $1 AND table_schema = 'public'`,
        [tableName],
      );
    const dbColNames = new Set(dbCols.map((c) => c.column_name));

    // 3. Colonne attese dall'entity (solo @Column non relations virtuali)
    const expectedCols = meta.columns
      .filter((c) => !c.isVirtual)
      .map((c) => c.databaseName);
    const expectedSet = new Set(expectedCols);

    // 4. Colonne nell'entity ma mancanti nel DB
    const missingInDb = expectedCols.filter((c) => !dbColNames.has(c));

    // 5. Colonne nel DB ma non nell'entity
    //    (potenzialmente sospette = duplicate o residui di vecchie migrazioni)
    const extraInDb = [...dbColNames].filter((c) => !expectedSet.has(c));

    // 6. Heuristic per duplicati camelCase/snake_case sospetti
    const duplicates: string[] = [];
    for (const extra of extraInDb) {
      const snake = extra.replace(/([A-Z])/g, '_$1').toLowerCase();
      const camel = extra.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (expectedSet.has(snake) || expectedSet.has(camel)) {
        duplicates.push(extra);
      }
    }

    // 7. Report
    if (missingInDb.length === 0 && duplicates.length === 0) {
      const extraNonDup = extraInDb.filter((c) => !duplicates.includes(c));
      const extraNote = extraNonDup.length ? C.yellow(` (+${extraNonDup.length} colonne extra non sospette)`) : '';
      console.log(`${C.green('✅')} ${tableName.padEnd(35)} OK (${expectedCols.length} colonne)${extraNote}`);
    } else {
      console.log(`${C.red('❌')} ${tableName.padEnd(35)} ${C.red('PROBLEMI:')}`);
      if (missingInDb.length) {
        console.log(`     ${C.red('→ mancanti nel DB:')} ${missingInDb.join(', ')}`);
        issues += missingInDb.length;
      }
      if (duplicates.length) {
        console.log(
          `     ${C.yellow('→ duplicati camelCase/snake_case sospetti:')} ${duplicates.join(', ')}`,
        );
        console.log(
          `     ${C.yellow('  ')}↳ TypeORM scriverà in UNA delle due colonne lasciando l'altra NULL`,
        );
        console.log(
          `     ${C.yellow('  ')}↳ Se l'altra è NOT NULL, ogni INSERT/UPDATE fallirà con 23502`,
        );
        issues += duplicates.length;
      }
    }
  }

  await ds.destroy();

  console.log();
  if (issues === 0) {
    console.log(C.green(C.bold('✨ Tutto OK — schema DB allineato alle entity TypeORM\n')));
    process.exit(0);
  }
  console.log(C.red(C.bold(`💥 ${issues} problema/i trovato/i — risolvili prima del deploy\n`)));
  process.exit(STRICT ? 1 : 0);
}

main().catch((err) => {
  console.error(C.red('Errore esecuzione check:'), err);
  process.exit(1);
});
