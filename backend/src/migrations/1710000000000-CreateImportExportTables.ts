import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateImportExportTables1710000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tabella import_jobs
    await queryRunner.createTable(
      new Table({
        name: 'import_jobs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tenant_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'target_entity',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'file_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'file_path',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'file_size',
            type: 'bigint',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
            default: "'pending'",
          },
          {
            name: 'template_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'mapping_config',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'stats',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'error_log',
            type: 'jsonb',
            default: "'[]'",
          },
          {
            name: 'validation_results',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'started_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'completed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Tabella import_templates
    await queryRunner.createTable(
      new Table({
        name: 'import_templates',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tenant_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'target_entity',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'column_mapping',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'validation_rules',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'duplicate_strategy',
            type: 'varchar',
            length: '20',
            default: "'SKIP'",
          },
          {
            name: 'is_default',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Foreign Keys per import_jobs
    await queryRunner.createForeignKey(
      'import_jobs',
      new TableForeignKey({
        columnNames: ['tenant_id'],
        referencedTableName: 'tenants',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'import_jobs',
      new TableForeignKey({
        columnNames: ['created_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'import_jobs',
      new TableForeignKey({
        columnNames: ['template_id'],
        referencedTableName: 'import_templates',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Foreign Keys per import_templates
    await queryRunner.createForeignKey(
      'import_templates',
      new TableForeignKey({
        columnNames: ['tenant_id'],
        referencedTableName: 'tenants',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'import_templates',
      new TableForeignKey({
        columnNames: ['created_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Indici per performance
    await queryRunner.query(
      `CREATE INDEX idx_import_jobs_tenant_status ON import_jobs(tenant_id, status)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_import_jobs_created_at ON import_jobs(created_at DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_import_templates_tenant_entity ON import_templates(tenant_id, target_entity)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('import_jobs');
    await queryRunner.dropTable('import_templates');
  }
}