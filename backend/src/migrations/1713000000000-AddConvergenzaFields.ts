import { MigrationInterface, QueryRunner } from "typeorm";

export class AddConvergenzaFields1713000000000 implements MigrationInterface {
    name = 'AddConvergenzaFields1713000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Crea enum per stato_globale
        await queryRunner.query(`CREATE TYPE "public"."practices_stato_globale_enum" AS ENUM('completo', 'non_completo')`);
        
        // Aggiungi colonne
        await queryRunner.query(`ALTER TABLE "practices" ADD "stato_globale" "public"."practices_stato_globale_enum"`);
        await queryRunner.query(`ALTER TABLE "practices" ADD "convergenza" jsonb`);
        await queryRunner.query(`ALTER TABLE "practices" ADD "lavorazioni_post_attivazione" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "practices" DROP COLUMN "lavorazioni_post_attivazione"`);
        await queryRunner.query(`ALTER TABLE "practices" DROP COLUMN "convergenza"`);
        await queryRunner.query(`ALTER TABLE "practices" DROP COLUMN "stato_globale"`);
        await queryRunner.query(`DROP TYPE "public"."practices_stato_globale_enum"`);
    }
}