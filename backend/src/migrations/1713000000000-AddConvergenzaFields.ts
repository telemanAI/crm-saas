import { MigrationInterface, QueryRunner } from "typeorm";

export class AddConvergenzaFields1713000000000 implements MigrationInterface {
    name = 'AddConvergenzaFields1713000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Crea enum per stato_globale (solo se non esiste)
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_type t 
                    JOIN pg_namespace n ON n.oid = t.typnamespace 
                    WHERE t.typname = 'practices_stato_globale_enum' AND n.nspname = 'public'
                ) THEN
                    CREATE TYPE "public"."practices_stato_globale_enum" AS ENUM('completo', 'non_completo');
                END IF;
            END $$;
        `);
        
        // Aggiungi colonne (solo se non esistono)
        await queryRunner.query(`ALTER TABLE "practices" ADD COLUMN IF NOT EXISTS "stato_globale" "public"."practices_stato_globale_enum"`);
        await queryRunner.query(`ALTER TABLE "practices" ADD COLUMN IF NOT EXISTS "convergenza" jsonb`);
        await queryRunner.query(`ALTER TABLE "practices" ADD COLUMN IF NOT EXISTS "lavorazioni_post_attivazione" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "practices" DROP COLUMN IF EXISTS "lavorazioni_post_attivazione"`);
        await queryRunner.query(`ALTER TABLE "practices" DROP COLUMN IF EXISTS "convergenza"`);
        await queryRunner.query(`ALTER TABLE "practices" DROP COLUMN IF EXISTS "stato_globale"`);
        
        // Elimina enum solo se nessuna colonna lo usa più
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM pg_type t 
                    JOIN pg_namespace n ON n.oid = t.typnamespace 
                    WHERE t.typname = 'practices_stato_globale_enum' AND n.nspname = 'public'
                ) THEN
                    DROP TYPE "public"."practices_stato_globale_enum";
                END IF;
            END $$;
        `);
    }
}