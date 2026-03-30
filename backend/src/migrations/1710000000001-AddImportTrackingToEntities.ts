import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddImportTrackingToEntities1710000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Aggiungi tracking a practices
    await queryRunner.addColumn(
      'practices',
      new TableColumn({
        name: 'source_import_job_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'practices',
      new TableColumn({
        name: 'import_metadata',
        type: 'jsonb',
        isNullable: true,
      }),
    );

    // Aggiungi tracking a customers
    await queryRunner.addColumn(
      'customers',
      new TableColumn({
        name: 'source_import_job_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'customers',
      new TableColumn({
        name: 'import_metadata',
        type: 'jsonb',
        isNullable: true,
      }),
    );

    // Indici per rollback veloce
    await queryRunner.query(
      `CREATE INDEX idx_practices_import_job ON practices(source_import_job_id) WHERE source_import_job_id IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_customers_import_job ON customers(source_import_job_id) WHERE source_import_job_id IS NOT NULL`,
    );

    // Constraint UNIQUE per prevenire duplicati clienti
    await queryRunner.query(
      `CREATE UNIQUE INDEX idx_customers_unique_cf_tenant ON customers(fiscal_code, tenant_id) WHERE fiscal_code IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('practices', 'source_import_job_id');
    await queryRunner.dropColumn('practices', 'import_metadata');
    await queryRunner.dropColumn('customers', 'source_import_job_id');
    await queryRunner.dropColumn('customers', 'import_metadata');
    await queryRunner.query(`DROP INDEX idx_customers_unique_cf_tenant`);
    await queryRunner.query(`DROP INDEX idx_practices_import_job`);
    await queryRunner.query(`DROP INDEX idx_customers_import_job`);
  }
}