import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSkyTvAndKoStatuses1775050000000 implements MigrationInterface {
    name = 'AddSkyTvAndKoStatuses1775050000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TYPE "public"."practices_operational_status_enum"
            ADD VALUE IF NOT EXISTS 'KO_CREDITO';
        `);
        await queryRunner.query(`
            ALTER TYPE "public"."practices_operational_status_enum"
            ADD VALUE IF NOT EXISTS 'KO_COPERTURA';
        `);
        await queryRunner.query(`
            ALTER TABLE "practices"
            ADD COLUMN IF NOT EXISTS "sky_tv_status" character varying(50) NULL;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "practices"
            DROP COLUMN IF EXISTS "sky_tv_status";
        `);
    }
}
