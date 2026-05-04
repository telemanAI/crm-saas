import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 1777800000007 — PHASE H
 *
 * BACKFILL FOUNDER MEMBERSHIP.
 *
 * FIX: rimossi valori enum inesistenti (MANAGER, SALES). Solo FOUNDER/ADMIN/OPERATOR
 * sono validi in membership_role_enum. Tutto il resto (SUPER_ADMIN, MANAGER, ecc.)
 * viene mappato a FOUNDER.
 */
export class PhaseHFounderMembershipBackfill1777800000007 implements MigrationInterface {
  name = 'PhaseHFounderMembershipBackfill1777800000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "_phase_h_membership_backfill_changes" (
        "user_id" uuid NOT NULL,
        "shop_id" uuid NOT NULL,
        "applied_at" timestamp with time zone DEFAULT NOW(),
        PRIMARY KEY ("user_id", "shop_id")
      )
    `);

    const before = await queryRunner.query(`
      SELECT COUNT(*) as cnt
      FROM users u
      WHERE u.tenant_id IS NOT NULL
        AND u.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM user_shop_memberships m
          WHERE m.user_id = u.id AND m.shop_id = u.tenant_id
        )
    `);
    const beforeCount = parseInt(before[0]?.cnt ?? '0', 10);
    // eslint-disable-next-line no-console
    console.log(`[PhaseHBackfill] Founder/utenti senza membership esplicita: ${beforeCount}`);

    await queryRunner.query(`
      WITH inserted AS (
        INSERT INTO user_shop_memberships
          (user_id, shop_id, role, permissions, is_active, joined_at)
        SELECT
          u.id,
          u.tenant_id,
          CASE UPPER(u.role::text)
            WHEN 'FOUNDER'      THEN 'FOUNDER'::membership_role_enum
            WHEN 'ADMIN'        THEN 'ADMIN'::membership_role_enum
            WHEN 'OPERATOR'     THEN 'OPERATOR'::membership_role_enum
            ELSE 'FOUNDER'::membership_role_enum
          END,
          jsonb_build_object(
            'canCreatePractices', true,
            'canEditPractices', true,
            'canDeletePractices', true,
            'canViewAllCustomers', true,
            'canEditCustomers', true,
            'canDeleteCustomers', true,
            'canViewProducts', true,
            'canManageProducts', true,
            'canSellDevices', true,
            'canManageSales', true,
            'canViewCompetitions', true,
            'canManageCompetitions', true,
            'canManageTeam', true,
            'canViewReports', true,
            'canImportData', true,
            'canExportData', true
          ),
          true,
          NOW()
        FROM users u
        WHERE u.tenant_id IS NOT NULL
          AND u.is_active = true
          AND NOT EXISTS (
            SELECT 1 FROM user_shop_memberships m
            WHERE m.user_id = u.id AND m.shop_id = u.tenant_id
          )
        ON CONFLICT (user_id, shop_id) DO NOTHING
        RETURNING user_id, shop_id
      )
      INSERT INTO "_phase_h_membership_backfill_changes" (user_id, shop_id)
      SELECT user_id, shop_id FROM inserted
      ON CONFLICT DO NOTHING
    `);

    const after = await queryRunner.query(
      `SELECT COUNT(*) as cnt FROM "_phase_h_membership_backfill_changes"`,
    );
    // eslint-disable-next-line no-console
    console.log(`[PhaseHBackfill] Membership create: ${parseInt(after[0]?.cnt ?? '0', 10)}`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM user_shop_memberships m
      USING "_phase_h_membership_backfill_changes" c
      WHERE m.user_id = c.user_id AND m.shop_id = c.shop_id
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "_phase_h_membership_backfill_changes"`);
  }
}