import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFounderRoleAndUserFields1710000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Aggiorna enum ruoli per includere FOUNDER
    await queryRunner.query(`
      ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'FOUNDER';
    `);

    // 2. Aggiungi campi mancanti alla tabella users (se non esistono)
    await queryRunner.query(`
      DO $$ 
      BEGIN
        -- is_active
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='users' AND column_name='is_active'
        ) THEN
          ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
        END IF;

        -- must_change_password
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='users' AND column_name='must_change_password'
        ) THEN
          ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT false;
        END IF;

        -- last_login
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='users' AND column_name='last_login'
        ) THEN
          ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
        END IF;
      END $$;
    `);

    // 3. Aggiorna il primo admin di ogni tenant a FOUNDER
    await queryRunner.query(`
      UPDATE users u
      SET role = 'FOUNDER'
      WHERE role = 'ADMIN'
      AND id = (
        SELECT id FROM users u2
        WHERE u2.tenant_id = u.tenant_id
        AND u2.role = 'ADMIN'
        ORDER BY created_at ASC
        LIMIT 1
      );
    `);

    // 4. Aggiungi campo isActive a tenants (se non esiste)
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='tenants' AND column_name='is_active'
        ) THEN
          ALTER TABLE tenants ADD COLUMN is_active BOOLEAN DEFAULT true;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: riporta FOUNDER ad ADMIN
    await queryRunner.query(`
      UPDATE users SET role = 'ADMIN' WHERE role = 'FOUNDER';
    `);

    // Non rimuoviamo colonne perché potrebbero essere in uso
    // In produzione, le drop vanno gestite con cautela
  }
}