-- ============================================================
-- MIGRAZIONE: Creazione tabella notifications
-- Esegui questo script UNA SOLA VOLTA sul DB di produzione
-- ============================================================

-- 1. Tipo enum per le notifiche (idempotente)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'notification_type_enum'
    ) THEN
        CREATE TYPE notification_type_enum AS ENUM (
            'PRACTICE_COMPLETED',
            'COMPETITION_COMPLETED',
            'COMPETITION_REMINDER',
            'PRACTICE_STALE'
        );
    END IF;
END $$;

-- 2. Tabella notifications (idempotente)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(36) NOT NULL,
    company_id VARCHAR(36),
    user_id VARCHAR(36) NOT NULL,
    type notification_type_enum DEFAULT 'PRACTICE_COMPLETED',
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    link_url VARCHAR(500),
    link_label VARCHAR(100),
    metadata JSONB,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Indici (idempotenti)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
    ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_created 
    ON notifications(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_company_created 
    ON notifications(company_id, created_at);

-- 4. Verifica
SELECT 'Tabella notifications creata con successo' AS result;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;
