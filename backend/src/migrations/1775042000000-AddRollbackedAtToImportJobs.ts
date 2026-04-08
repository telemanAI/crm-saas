import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRollbackedAtToImportJobs1775042000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE import_jobs 
      ADD COLUMN IF NOT EXISTS rollbacked_at TIMESTAMP;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE import_jobs 
      DROP COLUMN IF EXISTS rollbacked_at;
    `);
  }
}