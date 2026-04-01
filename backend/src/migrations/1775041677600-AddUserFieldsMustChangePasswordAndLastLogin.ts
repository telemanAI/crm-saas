import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserFieldsMustChangePasswordAndLastLogin1775041677600 implements MigrationInterface {
    name = 'AddUserFieldsMustChangePasswordAndLastLogin1775041677600'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "import_templates" DROP CONSTRAINT "FK_1cc7f8d63880068cd5ad00d0ab8"`);
        await queryRunner.query(`ALTER TABLE "import_templates" DROP CONSTRAINT "FK_548b03a5465b72170721b70c76e"`);
        await queryRunner.query(`ALTER TABLE "import_jobs" DROP CONSTRAINT "FK_96f340d5dff8bf3a3d2df26a2c3"`);
        await queryRunner.query(`ALTER TABLE "import_jobs" DROP CONSTRAINT "FK_c1e1a770077399d5c20cb404cbf"`);
        await queryRunner.query(`ALTER TABLE "import_jobs" DROP CONSTRAINT "FK_7a52434dea4fbab03202d11219e"`);
        await queryRunner.query(`DROP INDEX "public"."idx_customers_import_job"`);
        await queryRunner.query(`DROP INDEX "public"."idx_customers_unique_cf_tenant"`);
        await queryRunner.query(`DROP INDEX "public"."idx_practices_import_job"`);
        await queryRunner.query(`DROP INDEX "public"."idx_import_templates_tenant_entity"`);
        await queryRunner.query(`DROP INDEX "public"."idx_import_jobs_tenant_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_import_jobs_created_at"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "must_change_password" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "users" ADD "last_login" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('SUPER_ADMIN', 'ADMIN', 'FOUNDER', 'OPERATOR')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "role" "public"."users_role_enum" NOT NULL DEFAULT 'OPERATOR'`);
        await queryRunner.query(`ALTER TABLE "import_templates" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "import_templates" ADD "name" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "import_templates" DROP COLUMN "target_entity"`);
        await queryRunner.query(`ALTER TABLE "import_templates" ADD "target_entity" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "import_templates" DROP COLUMN "duplicate_strategy"`);
        await queryRunner.query(`ALTER TABLE "import_templates" ADD "duplicate_strategy" character varying NOT NULL DEFAULT 'SKIP'`);
        await queryRunner.query(`ALTER TABLE "import_templates" ALTER COLUMN "created_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "import_templates" ALTER COLUMN "updated_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "import_jobs" DROP COLUMN "target_entity"`);
        await queryRunner.query(`ALTER TABLE "import_jobs" ADD "target_entity" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "import_jobs" DROP COLUMN "file_name"`);
        await queryRunner.query(`ALTER TABLE "import_jobs" ADD "file_name" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "import_jobs" DROP COLUMN "file_path"`);
        await queryRunner.query(`ALTER TABLE "import_jobs" ADD "file_path" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "import_jobs" DROP COLUMN "file_size"`);
        await queryRunner.query(`ALTER TABLE "import_jobs" ADD "file_size" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "import_jobs" DROP COLUMN "template_id"`);
        await queryRunner.query(`ALTER TABLE "import_jobs" ADD "template_id" character varying`);
        await queryRunner.query(`ALTER TABLE "import_jobs" ALTER COLUMN "created_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "import_jobs" ALTER COLUMN "updated_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "import_templates" ADD CONSTRAINT "FK_1cc7f8d63880068cd5ad00d0ab8" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "import_templates" ADD CONSTRAINT "FK_548b03a5465b72170721b70c76e" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "import_jobs" ADD CONSTRAINT "FK_96f340d5dff8bf3a3d2df26a2c3" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "import_jobs" ADD CONSTRAINT "FK_c1e1a770077399d5c20cb404cbf" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "import_jobs" DROP CONSTRAINT "FK_c1e1a770077399d5c20cb404cbf"`);
        await queryRunner.query(`ALTER TABLE "import_jobs" DROP CONSTRAINT "FK_96f340d5dff8bf3a3d2df26a2c3"`);
        await queryRunner.query(`ALTER TABLE "import_templates" DROP CONSTRAINT "FK_548b03a5465b72170721b70c76e"`);
        await queryRunner.query(`ALTER TABLE "import_templates" DROP CONSTRAINT "FK_1cc7f8d63880068cd5ad00d0ab8"`);
        await queryRunner.query(`ALTER TABLE "import_jobs" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "import_jobs" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "import_jobs" DROP COLUMN "template_id"`);
        await queryRunner.query(`ALTER TABLE "import_jobs" ADD "template_id" uuid`);
        await queryRunner.query(`ALTER TABLE "import_jobs" DROP COLUMN "file_size"`);
        await queryRunner.query(`ALTER TABLE "import_jobs" ADD "file_size" bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE "import_jobs" DROP COLUMN "file_path"`);
        await queryRunner.query(`ALTER TABLE "import_jobs" ADD "file_path" character varying(500) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "import_jobs" DROP COLUMN "file_name"`);
        await queryRunner.query(`ALTER TABLE "import_jobs" ADD "file_name" character varying(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "import_jobs" DROP COLUMN "target_entity"`);
        await queryRunner.query(`ALTER TABLE "import_jobs" ADD "target_entity" character varying(50) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "import_templates" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "import_templates" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "import_templates" DROP COLUMN "duplicate_strategy"`);
        await queryRunner.query(`ALTER TABLE "import_templates" ADD "duplicate_strategy" character varying(20) NOT NULL DEFAULT 'SKIP'`);
        await queryRunner.query(`ALTER TABLE "import_templates" DROP COLUMN "target_entity"`);
        await queryRunner.query(`ALTER TABLE "import_templates" ADD "target_entity" character varying(50) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "import_templates" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "import_templates" ADD "name" character varying(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "role" character varying(50) NOT NULL DEFAULT 'ADMIN'`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "last_login"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "must_change_password"`);
        await queryRunner.query(`CREATE INDEX "idx_import_jobs_created_at" ON "import_jobs" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "idx_import_jobs_tenant_status" ON "import_jobs" ("status", "tenant_id") `);
        await queryRunner.query(`CREATE INDEX "idx_import_templates_tenant_entity" ON "import_templates" ("target_entity", "tenant_id") `);
        await queryRunner.query(`CREATE INDEX "idx_practices_import_job" ON "practices" ("source_import_job_id") WHERE (source_import_job_id IS NOT NULL)`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_customers_unique_cf_tenant" ON "customers" ("fiscal_code", "tenant_id") WHERE (fiscal_code IS NOT NULL)`);
        await queryRunner.query(`CREATE INDEX "idx_customers_import_job" ON "customers" ("source_import_job_id") WHERE (source_import_job_id IS NOT NULL)`);
        await queryRunner.query(`ALTER TABLE "import_jobs" ADD CONSTRAINT "FK_7a52434dea4fbab03202d11219e" FOREIGN KEY ("template_id") REFERENCES "import_templates"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "import_jobs" ADD CONSTRAINT "FK_c1e1a770077399d5c20cb404cbf" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "import_jobs" ADD CONSTRAINT "FK_96f340d5dff8bf3a3d2df26a2c3" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "import_templates" ADD CONSTRAINT "FK_548b03a5465b72170721b70c76e" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "import_templates" ADD CONSTRAINT "FK_1cc7f8d63880068cd5ad00d0ab8" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
