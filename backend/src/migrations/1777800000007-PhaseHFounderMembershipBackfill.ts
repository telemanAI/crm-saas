import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 1777800000007 — PHASE H
 *
 * BACKFILL FOUNDER MEMBERSHIP.
 *
 * In produzione abbiamo founder che hanno `users.tenant_id` valorizzato
 * ma nessuna riga in `user_shop_memberships`. Questo causa:
 *   - JWT.tenantId = null → crash su INSERT inventory/practices/customers
 *   - lo switch shop non funziona perché non vede membership
 *   - la pagina team li mostra ma senza permessi configurabili
 *
 * Questa migration:
 *   1. Trova tutti gli utenti con `tenant_id IS NOT NULL` MA senza riga
 *      attiva in `user_shop_memberships` per quel `(user_id, shop_id)`.
 *   2. Crea la membership con role=FOUNDER e i permessi default founder.
 *   3. Logga il count.
 *   4. Idempotente: la INSERT ha ON CONFLICT DO NOTHING.
 *
 * Permission default founder (allineati alla Phase B):
 *   canCreatePractices, canEditPractices, canDeletePractices,
 *   canViewAllCustomers, canEditCustomers, canDeleteCustomers,
 *   canViewProducts, canManageProducts, canSellDevices, canManageSales,
 *   canViewCompetitions, canManageCompetitions,
 *   canManageTeam, canViewReports, canImportData, canExportData
 */
export class PhaseHFounderMembershipBackfill1777800000007 implements MigrationInterface {
  name = 'PhaseHFounderMembershipBackfill1777800000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tabella di tracking per rollback safe
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "_phase_h_membership_backfill_changes" (
        "user_id" uuid NOT NULL,
        "shop_id" uuid NOT NULL,
        "applied_at" timestamp with time zone DEFAULT NOW(),
        PRIMARY KEY ("user_id", "shop_id")
      )
    `);

    // Conta candidati prima
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

    // Inserisce le membership mancanti.
    // Permissions: jsonb completo coi default founder (Phase B compliant).
    await queryRunner.query(`
      WITH inserted AS (
        INSERT INTO user_shop_memberships
          (user_id, shop_id, role, permissions, is_active, joined_at)
        SELECT
          u.id,
          u.tenant_id,
          COALESCE(NULLIF(UPPER(u.role::text), ''), 'FOUNDER'),
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
    // Rollback: rimuove SOLO le membership create da questa migration
    await queryRunner.query(`
      DELETE FROM user_shop_memberships m
      USING "_phase_h_membership_backfill_changes" c
      WHERE m.user_id = c.user_id AND m.shop_id = c.shop_id
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "_phase_h_membership_backfill_changes"`);
  }
}
