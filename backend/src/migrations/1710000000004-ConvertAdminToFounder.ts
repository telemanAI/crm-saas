import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertAdminToFounder1710000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Converti il primo ADMIN di ogni tenant in FOUNDER
    await queryRunner.query(`
      UPDATE users u
      SET role = 'FOUNDER'
      WHERE role = 'ADMIN'
      AND id IN (
        SELECT DISTINCT ON (tenant_id) id
        FROM users
        WHERE role = 'ADMIN'
        ORDER BY tenant_id, created_at ASC
      );
    `);

    console.log('✅ Primi admin di ogni tenant convertiti in FOUNDER');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: riconverti FOUNDER in ADMIN
    await queryRunner.query(`
      UPDATE users SET role = 'ADMIN' WHERE role = 'FOUNDER';
    `);
  }
}