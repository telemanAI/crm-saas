import { SetMetadata } from '@nestjs/common';

export const AUDIT_LOG_KEY = 'audit_log';

export interface AuditLogOptions {
  /** Verbo/azione (es. CREATE, UPDATE, DELETE, FORCE_COMPLETE). */
  action: string;
  /** Tipo entità coinvolta (es. practice, customer, membership, invite). */
  entityType: string;
  /**
   * Se true, la response del controller conterrà l'id usato come entityId.
   * Se false, usiamo req.params.id se presente.
   */
  captureFromResponse?: boolean;
}

/**
 * Decorator per marcare una route come loggabile nell'audit trail.
 * L'AuditInterceptor raccoglie l'informazione e la persiste in audit_logs.
 *
 * Esempio:
 *   @Post(':id/force-complete')
 *   @AuditLog({ action: 'FORCE_COMPLETE', entityType: 'practice' })
 */
export const AuditLog = (options: AuditLogOptions) =>
  SetMetadata(AUDIT_LOG_KEY, options);
