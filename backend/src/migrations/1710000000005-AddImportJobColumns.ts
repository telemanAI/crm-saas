import { MigrationInterface, QueryRunner } from "typeorm";

export class AddImportTrackingColumns1710000000005 implements MigrationInterface {
    name = 'AddImportTrackingColumns1710000000005'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "import_jobs" ADD COLUMN IF NOT EXISTS "file_format" character varying DEFAULT 'flat'`);
        await queryRunner.query(`ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "source_import_job_id" character varying`);
        await queryRunner.query(`ALTER TABLE "practices" ADD COLUMN IF NOT EXISTS "source_import_job_id" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "import_jobs" DROP COLUMN IF EXISTS "file_format"`);
        await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN IF EXISTS "source_import_job_id"`);
        await queryRunner.query(`ALTER TABLE "practices" DROP COLUMN IF EXISTS "source_import_job_id"`);
    }
}