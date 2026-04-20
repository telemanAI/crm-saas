import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserMustChangePasswordColumn1775047395771 implements MigrationInterface {
    name = 'AddUserMustChangePasswordColumn1775047395771'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. DROP CONSTRAINT safe
        await queryRunner.query(`ALTER TABLE "import_jobs" DROP CONSTRAINT IF EXISTS "FK_96f340d5dff8bf3a3d2df26a2c3"`);
        await queryRunner.query(`ALTER TABLE "import_jobs" DROP CONSTRAINT IF EXISTS "FK_c1e1a770077399d5c20cb404cbf"`);
        await queryRunner.query(`ALTER TABLE "import_jobs" DROP CONSTRAINT IF EXISTS "FK_7a52434dea4fbab03202d11219e"`);
        await queryRunner.query(`ALTER TABLE "import_templates" DROP CONSTRAINT IF EXISTS "FK_1cc7f8d63880068cd5ad00d0ab8"`);
        await queryRunner.query(`ALTER TABLE "import_templates" DROP CONSTRAINT IF EXISTS "FK_548b03a5465b72170721b70c76e"`);

        // 2. DROP INDEX safe
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_customers_import_job"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_customers_unique_cf_tenant"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_practices_import_job"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_import_jobs_tenant_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_import_jobs_created_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_import_templates_tenant_entity"`);

        // 3. USERS — aggiungi colonne safe
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "must_change_password" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login" TIMESTAMP`);

        // 4. USERS role — safe: se è varchar la converte in enum, se è già enum la lascia stare
        await queryRunner.query(`
            DO $do$
            BEGIN
                -- Se role esiste come varchar, droppala
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'users' AND column_name = 'role' AND data_type = 'character varying'
                ) THEN
                    ALTER TABLE "users" DROP COLUMN "role";
                END IF;

                -- Crea enum se non esiste
                IF NOT EXISTS (
                    SELECT 1 FROM pg_type t 
                    JOIN pg_namespace n ON n.oid = t.typnamespace 
                    WHERE t.typname = 'users_role_enum' AND n.nspname = 'public'
                ) THEN
                    CREATE TYPE "public"."users_role_enum" AS ENUM('SUPER_ADMIN', 'ADMIN', 'FOUNDER', 'OPERATOR');
                END IF;

                -- Aggiungi role enum solo se non esiste
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'users' AND column_name = 'role'
                ) THEN
                    ALTER TABLE "users" ADD COLUMN "role" "public"."users_role_enum" NOT NULL DEFAULT 'OPERATOR';
                END IF;
            END $do$;
        `);

        // 5. IMPORT_JOBS — ricrea colonne safe (con DEFAULT per tabelle con dati)
        await queryRunner.query(`ALTER TABLE "import_jobs" DROP COLUMN IF EXISTS "target_entity"`);
        await queryRunner.query(`ALTER TABLE "import_jobs" ADD COLUMN IF NOT EXISTS "target_entity" character varying NOT NULL DEFAULT ''`);
        
        await queryRunner.query(`ALTER TABLE "import_jobs" DROP COLUMN IF EXISTS "file_name"`);
        await queryRunner.query(`ALTER TABLE "import_jobs" ADD COLUMN IF NOT EXISTS "file_name" character varying NOT NULL DEFAULT ''`);
        
        await queryRunner.query(`ALTER TABLE "import_jobs" DROP COLUMN IF EXISTS "file_path"`);
        await queryRunner.query(`ALTER TABLE "import_jobs" ADD COLUMN IF NOT EXISTS "file_path" character varying NOT NULL DEFAULT ''`);
        
        await queryRunner.query(`ALTER TABLE "import_jobs" DROP COLUMN IF EXISTS "file_size"`);
        await queryRunner.query(`ALTER TABLE "import_jobs" ADD COLUMN IF NOT EXISTS "file_size" integer NOT NULL DEFAULT 0`);
        
        await queryRunner.query(`ALTER TABLE "import_jobs" DROP COLUMN IF EXISTS "template_id"`);
        await queryRunner.query(`ALTER TABLE "import_jobs" ADD COLUMN IF NOT EXISTS "template_id" character varying`);
        
        await queryRunner.query(`ALTER TABLE "import_jobs" ALTER COLUMN "created_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "import_jobs" ALTER COLUMN "updated_at" SET DEFAULT now()`);

        // 6. IMPORT_TEMPLATES — ricrea colonne safe
        await queryRunner.query(`ALTER TABLE "import_templates" DROP COLUMN IF EXISTS "name"`);
        await queryRunner.query(`ALTER TABLE "import_templates" ADD COLUMN IF NOT EXISTS "name" character varying NOT NULL DEFAULT ''`);
        
        await queryRunner.query(`ALTER TABLE "import_templates" DROP COLUMN IF EXISTS "target_entity"`);
        await queryRunner.query(`ALTER TABLE "import_templates" ADD COLUMN IF NOT EXISTS "target_entity" character varying NOT NULL DEFAULT ''`);
        
        await queryRunner.query(`ALTER TABLE "import_templates" DROP COLUMN IF EXISTS "duplicate_strategy"`);
        await queryRunner.query(`ALTER TABLE "import_templates" ADD COLUMN IF NOT EXISTS "duplicate_strategy" character varying NOT NULL DEFAULT 'SKIP'`);
        
        await queryRunner.query(`ALTER TABLE "import_templates" ALTER COLUMN "created_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "import_templates" ALTER COLUMN "updated_at" SET DEFAULT now()`);

        // 7. ADD CONSTRAINT safe
        await queryRunner.query(`
            DO $do$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_96f340d5dff8bf3a3d2df26a2c3') THEN
                    ALTER TABLE "import_jobs" ADD CONSTRAINT "FK_96f340d5dff8bf3a3d2df26a2c3" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
            END $do$;
        `);
        await queryRunner.query(`
            DO $do$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_c1e1a770077399d5c20cb404cbf') THEN
                    ALTER TABLE "import_jobs" ADD CONSTRAINT "FK_c1e1a770077399d5c20cb404cbf" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
            END $do$;
        `);
        await queryRunner.query(`
            DO $do$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_1cc7f8d63880068cd5ad00d0ab8') THEN
                    ALTER TABLE "import_templates" ADD CONSTRAINT "FK_1cc7f8d63880068cd5ad00d0ab8" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
            END $do$;
        `);
        await queryRunner.query(`
            DO $do$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_548b03a5465b72170721b70c76e') THEN
                    ALTER TABLE "import_templates" ADD CONSTRAINT "FK_548b03a5465b72170721b70c76e" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
            END $do$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Down safe
        await queryRunner.query(`ALTER TABLE "import_templates" DROP CONSTRAINT IF EXISTS "FK_548b03a5465b72170721b70c76e"`);
        await queryRunner.query(`ALTER TABLE "import_templates" DROP CONSTRAINT IF EXISTS "FK_1cc7f8d63880068cd5ad00d0ab8"`);
        await queryRunner.query(`ALTER TABLE "import_jobs" DROP CONSTRAINT IF EXISTS "FK_c1e1a770077399d5c20cb404cbf"`);
        await queryRunner.query(`ALTER TABLE "import_jobs" DROP CONSTRAINT IF EXISTS "FK_96f340d5dff8bf3a3d2df26a2c3"`);

        await queryRunner.query(`ALTER TABLE "import_templates" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "import_templates" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`);

        await queryRunner.query(`ALTER TABLE "import_templates" DROP COLUMN IF EXISTS "duplicate_strategy"`);
        await queryRunner.query(`ALTER TABLE "import_templates" ADD COLUMN IF NOT EXISTS "duplicate_strategy" character varying(20) NOT NULL DEFAULT 'SKIP'`);

        await queryRunner.query(`ALTER TABLE "import_templates" DROP COLUMN IF EXISTS "target_entity"`);
        await queryRunner.query(`ALTER TABLE "import_templates" ADD COLUMN IF NOT EXISTS "target_entity" character varying(50) NOT NULL DEFAULT ''`);

        await queryRunner.query(`ALTER TABLE "import_templates" DROP COLUMN IF EXISTS "name"`);
        await queryRunner.query(`ALTER TABLE "import_templates" ADD COLUMN IF NOT EXISTS "name" character varying(255) NOT NULL DEFAULT ''`);

        await queryRunner.query(`ALTER TABLE "import_jobs" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "import_jobs" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`);

        await queryRunner.query(`ALTER TABLE "import_jobs" DROP COLUMN IF EXISTS "template_id"`);
        await queryRunner.query(`ALTER TABLE "import_jobs" ADD COLUMN IF NOT EXISTS "template_id" uuid`);

        await queryRunner.query(`ALTER TABLE "import_jobs" DROP COLUMN IF EXISTS "file_size"`);
        await queryRunner.query(`ALTER TABLE "import_jobs" ADD COLUMN IF NOT EXISTS "file_size" bigint NOT NULL DEFAULT 0`);

        await queryRunner.query(`ALTER TABLE "import_jobs" DROP COLUMN IF EXISTS "file_path"`);
        await queryRunner.query(`ALTER TABLE "import_jobs" ADD COLUMN IF NOT EXISTS "file_path" character varying(500) NOT NULL DEFAULT ''`);

        await queryRunner.query(`ALTER TABLE "import_jobs" DROP COLUMN IF EXISTS "file_name"`);
        await queryRunner.query(`ALTER TABLE "import_jobs" ADD COLUMN IF NOT EXISTS "file_name" character varying(255) NOT NULL DEFAULT ''`);

        await queryRunner.query(`ALTER TABLE "import_jobs" DROP COLUMN IF EXISTS "target_entity"`);
        await queryRunner.query(`ALTER TABLE "import_jobs" ADD COLUMN IF NOT EXISTS "target_entity" character varying(50) NOT NULL DEFAULT ''`);

        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "role"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_role_enum"`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" character varying(50) NOT NULL DEFAULT 'ADMIN'`);

        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "last_login"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "must_change_password"`);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_import_templates_tenant_entity" ON "import_templates" ("target_entity", "tenant_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_import_jobs_created_at" ON "import_jobs" ("created_at")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_import_jobs_tenant_status" ON "import_jobs" ("status", "tenant_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_practices_import_job" ON "practices" ("source_import_job_id") WHERE (source_import_job_id IS NOT NULL)`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "idx_customers_unique_cf_tenant" ON "customers" ("fiscal_code", "tenant_id") WHERE (fiscal_code IS NOT NULL)`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_customers_import_job" ON "customers" ("source_import_job_id") WHERE (source_import_job_id IS NOT NULL)`);

        await queryRunner.query(`
            DO $do$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_548b03a5465b72170721b70c76e') THEN
                    ALTER TABLE "import_templates" ADD CONSTRAINT "FK_548b03a5465b72170721b70c76e" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
                END IF;
            END $do$;
        `);
        await queryRunner.query(`
            DO $do$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_1cc7f8d63880068cd5ad00d0ab8') THEN
                    ALTER TABLE "import_templates" ADD CONSTRAINT "FK_1cc7f8d63880068cd5ad00d0ab8" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
                END IF;
            END $do$;
        `);
        await queryRunner.query(`
            DO $do$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_7a52434dea4fbab03202d11219e') THEN
                    ALTER TABLE "import_jobs" ADD CONSTRAINT "FK_7a52434dea4fbab03202d11219e" FOREIGN KEY ("template_id") REFERENCES "import_templates"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
                END IF;
            END $do$;
        `);
        await queryRunner.query(`
            DO $do$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_c1e1a770077399d5c20cb404cbf') THEN
                    ALTER TABLE "import_jobs" ADD CONSTRAINT "FK_c1e1a770077399d5c20cb404cbf" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
                END IF;
            END $do$;
        `);
        await queryRunner.query(`
            DO $do$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_96f340d5dff8bf3a3d2df26a2c3') THEN
                    ALTER TABLE "import_jobs" ADD CONSTRAINT "FK_96f340d5dff8bf3a3d2df26a2c3" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
                END IF;
            END $do$;
        `);
    }
}