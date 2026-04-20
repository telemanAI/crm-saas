import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migrazione v2 Multi-Shop / Social Auth / OTP / Invites.
 *
 * Strategia ADDITIVA: nessun DROP, nessuna modifica distruttiva ai dati esistenti.
 * - Aggiunge colonne nuove a users (provider, provider_id, avatar_url) e rende password_hash nullable
 * - Aggiunge colonna company_id a tenants (nullable, popolata dopo)
 * - Crea companies, user_shop_memberships, invites, otp_codes, pending_registrations
 * - Data migration: per ogni Tenant esistente crea una Company (legalName=tenant.name, vatNumber=tenant.vatNumber)
 *   e per ogni User esistente con tenantId crea una UserShopMembership corrispondente
 */
export class MultiShopAuthV2 implements MigrationInterface {
  name = 'MultiShopAuthV2' + Date.now();

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Alter USERS - additive
    await queryRunner.query(`ALTER TABLE \"users\" ALTER COLUMN \"password_hash\" DROP NOT NULL`);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE \"auth_provider_enum\" AS ENUM ('local','google','facebook','otp');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`ALTER TABLE \"users\" ADD COLUMN IF NOT EXISTS \"provider\" \"auth_provider_enum\" DEFAULT 'local'`);
    await queryRunner.query(`ALTER TABLE \"users\" ADD COLUMN IF NOT EXISTS \"provider_id\" varchar(255)`);
    await queryRunner.query(`ALTER TABLE \"users\" ADD COLUMN IF NOT EXISTS \"avatar_url\" text`);

    // 2) Alter TENANTS - additive (company_id nullable)
    await queryRunner.query(`ALTER TABLE \"tenants\" ADD COLUMN IF NOT EXISTS \"company_id\" uuid`);

    // 3) Create COMPANIES
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \"companies\" (
        \"id\" uuid NOT NULL DEFAULT uuid_generate_v4(),
        \"legal_name\" varchar(255) NOT NULL,
        \"vat_number\" varchar(50),
        \"owner_id\" uuid NOT NULL,
        \"email\" varchar(255),
        \"phone\" varchar(50),
        \"billing_address\" jsonb NOT NULL DEFAULT '{}',
        \"is_active\" boolean NOT NULL DEFAULT true,
        \"created_at\" TIMESTAMP NOT NULL DEFAULT now(),
        \"updated_at\" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT \"PK_companies\" PRIMARY KEY (\"id\")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS \"UQ_companies_name_vat\" ON \"companies\" (\"legal_name\", COALESCE(\"vat_number\",''))
    `);

    // 4) Data migration: crea Company per ogni Tenant esistente
    await queryRunner.query(`
      INSERT INTO \"companies\" (\"id\", \"legal_name\", \"vat_number\", \"owner_id\", \"is_active\", \"created_at\", \"updated_at\")
      SELECT uuid_generate_v4(), t.name, t.vat_number,
             COALESCE(
               (SELECT u.id FROM users u WHERE u.tenant_id = t.id AND u.role = 'FOUNDER' LIMIT 1),
               (SELECT u.id FROM users u WHERE u.tenant_id = t.id AND u.role = 'ADMIN' LIMIT 1),
               (SELECT u.id FROM users u WHERE u.tenant_id = t.id LIMIT 1),
               uuid_generate_v4()
             ),
             true, now(), now()
      FROM \"tenants\" t
      WHERE t.company_id IS NULL
    `);

    // 5) Link tenants.company_id alla Company (match per nome+vat+owner)
    await queryRunner.query(`
      UPDATE \"tenants\" t
      SET company_id = c.id
      FROM \"companies\" c
      WHERE t.company_id IS NULL
        AND c.legal_name = t.name
        AND COALESCE(c.vat_number,'') = COALESCE(t.vat_number,'')
    `);

    // 6) Create USER_SHOP_MEMBERSHIPS
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE \"membership_role_enum\" AS ENUM ('FOUNDER','ADMIN','OPERATOR');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \"user_shop_memberships\" (
        \"id\" uuid NOT NULL DEFAULT uuid_generate_v4(),
        \"user_id\" uuid NOT NULL,
        \"shop_id\" uuid NOT NULL,
        \"role\" \"membership_role_enum\" NOT NULL DEFAULT 'OPERATOR',
        \"permissions\" jsonb NOT NULL DEFAULT '{}',
        \"is_active\" boolean NOT NULL DEFAULT true,
        \"invited_by\" uuid,
        \"joined_at\" TIMESTAMP NOT NULL DEFAULT now(),
        \"left_at\" TIMESTAMP,
        \"end_of_relationship_note\" text,
        \"created_at\" TIMESTAMP NOT NULL DEFAULT now(),
        \"updated_at\" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT \"PK_user_shop_memberships\" PRIMARY KEY (\"id\"),
        CONSTRAINT \"UQ_membership_user_shop\" UNIQUE (\"user_id\",\"shop_id\"),
        CONSTRAINT \"FK_membership_user\" FOREIGN KEY (\"user_id\") REFERENCES \"users\"(\"id\") ON DELETE CASCADE,
        CONSTRAINT \"FK_membership_shop\" FOREIGN KEY (\"shop_id\") REFERENCES \"tenants\"(\"id\") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS \"IDX_membership_user\" ON \"user_shop_memberships\"(\"user_id\")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS \"IDX_membership_shop\" ON \"user_shop_memberships\"(\"shop_id\")`);

    // 7) Seed memberships dai dati esistenti (users.tenantId → membership)
    await queryRunner.query(`
      INSERT INTO \"user_shop_memberships\" (\"user_id\",\"shop_id\",\"role\",\"permissions\",\"is_active\",\"joined_at\",\"created_at\",\"updated_at\")
      SELECT u.id, u.tenant_id,
             CASE
               WHEN u.role = 'FOUNDER' THEN 'FOUNDER'::membership_role_enum
               WHEN u.role = 'ADMIN' THEN 'ADMIN'::membership_role_enum
               ELSE 'OPERATOR'::membership_role_enum
             END,
             '{}'::jsonb,
             u.is_active,
             u.created_at,
             now(),
             now()
      FROM \"users\" u
      WHERE u.tenant_id IS NOT NULL
        AND u.role != 'SUPER_ADMIN'
        AND NOT EXISTS (
          SELECT 1 FROM \"user_shop_memberships\" m
          WHERE m.user_id = u.id AND m.shop_id = u.tenant_id
        )
    `);

    // 8) Create INVITES
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE \"invite_status_enum\" AS ENUM ('PENDING','ACCEPTED','EXPIRED','REVOKED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \"invites\" (
        \"id\" uuid NOT NULL DEFAULT uuid_generate_v4(),
        \"token\" varchar(255) NOT NULL,
        \"shop_id\" uuid NOT NULL,
        \"email\" varchar(255) NOT NULL,
        \"role\" \"membership_role_enum\" NOT NULL DEFAULT 'OPERATOR',
        \"permissions\" jsonb NOT NULL DEFAULT '{}',
        \"invited_by\" uuid NOT NULL,
        \"status\" \"invite_status_enum\" NOT NULL DEFAULT 'PENDING',
        \"expires_at\" TIMESTAMP NOT NULL,
        \"accepted_at\" TIMESTAMP,
        \"accepted_by_user_id\" uuid,
        \"admin_note\" text,
        \"created_at\" TIMESTAMP NOT NULL DEFAULT now(),
        \"updated_at\" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT \"PK_invites\" PRIMARY KEY (\"id\"),
        CONSTRAINT \"FK_invite_shop\" FOREIGN KEY (\"shop_id\") REFERENCES \"tenants\"(\"id\") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS \"UQ_invites_token\" ON \"invites\"(\"token\")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS \"IDX_invite_shop_email\" ON \"invites\"(\"shop_id\",\"email\")`);

    // 9) Create OTP_CODES
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \"otp_codes\" (
        \"id\" uuid NOT NULL DEFAULT uuid_generate_v4(),
        \"email\" varchar(255) NOT NULL,
        \"code_hash\" varchar(255) NOT NULL,
        \"expires_at\" TIMESTAMP NOT NULL,
        \"used\" boolean NOT NULL DEFAULT false,
        \"attempt_count\" integer NOT NULL DEFAULT 0,
        \"created_at\" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT \"PK_otp_codes\" PRIMARY KEY (\"id\")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS \"IDX_otp_email\" ON \"otp_codes\"(\"email\")`);

    // 10) Create PENDING_REGISTRATIONS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \"pending_registrations\" (
        \"id\" uuid NOT NULL DEFAULT uuid_generate_v4(),
        \"token\" varchar(255) NOT NULL,
        \"email\" varchar(255) NOT NULL,
        \"provider\" \"auth_provider_enum\" NOT NULL,
        \"provider_id\" varchar(255),
        \"first_name\" varchar(100),
        \"last_name\" varchar(100),
        \"avatar_url\" text,
        \"expires_at\" TIMESTAMP NOT NULL,
        \"created_at\" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT \"PK_pending_registrations\" PRIMARY KEY (\"id\")
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS \"UQ_pending_token\" ON \"pending_registrations\"(\"token\")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS \"IDX_pending_email\" ON \"pending_registrations\"(\"email\")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \"pending_registrations\"`);
    await queryRunner.query(`DROP TABLE IF EXISTS \"otp_codes\"`);
    await queryRunner.query(`DROP TABLE IF EXISTS \"invites\"`);
    await queryRunner.query(`DROP TABLE IF EXISTS \"user_shop_memberships\"`);
    await queryRunner.query(`ALTER TABLE \"tenants\" DROP COLUMN IF EXISTS \"company_id\"`);
    await queryRunner.query(`DROP TABLE IF EXISTS \"companies\"`);
    await queryRunner.query(`ALTER TABLE \"users\" DROP COLUMN IF EXISTS \"avatar_url\"`);
    await queryRunner.query(`ALTER TABLE \"users\" DROP COLUMN IF EXISTS \"provider_id\"`);
    await queryRunner.query(`ALTER TABLE \"users\" DROP COLUMN IF EXISTS \"provider\"`);
    await queryRunner.query(`DROP TYPE IF EXISTS \"auth_provider_enum\"`);
    await queryRunner.query(`DROP TYPE IF EXISTS \"membership_role_enum\"`);
    await queryRunner.query(`DROP TYPE IF EXISTS \"invite_status_enum\"`);
  }
}
