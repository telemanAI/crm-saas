import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';
import { AUDIT_LOG_KEY, AuditLogOptions } from './decorators/audit-log.decorator';

/**
 * Intercetta le route marcate con @AuditLog(...) e scrive una riga in audit_logs
 * DOPO che la request si è completata con successo.
 *
 * Informazioni tracciate:
 *  - action, entityType (dal decorator)
 *  - userId (da req.user.id/sub/userId)
 *  - tenantId (da req.user.tenantId)
 *  - entityId (da res.id oppure req.params.id)
 *  - newValues: response trimmata (se non troppo grande)
 *  - metadata: method+url+ip
 *
 * Nota: se la richiesta fallisce (eccezione), non logghiamo — il comportamento
 * desiderato è "audit delle azioni andate a buon fine". Per audit fallimenti
 * si usa filter dedicato (fuori scope di questo interceptor base).
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const options = this.reflector.get<AuditLogOptions | undefined>(
      AUDIT_LOG_KEY,
      ctx.getHandler(),
    );
    if (!options) return next.handle();

    const req = ctx.switchToHttp().getRequest();
    const user = req.user || {};

    return next.handle().pipe(
      tap(async (response: any) => {
        try {
          const entityId: string | null =
            (response && (response.id || response?.membership?.id)) ||
            req.params?.id ||
            null;

          const safeNew = this.safeTrim(response);

          await this.auditService.logAction({
            userId: user.id || user.userId || user.sub || null,
            tenantId: user.tenantId || null,
            action: options.action,
            entityType: options.entityType,
            entityId,
            newValues: safeNew,
            metadata: {
              method: req.method,
              url: req.originalUrl || req.url,
              ip: req.ip || req.headers?.['x-forwarded-for'] || null,
              ua: req.headers?.['user-agent'] || null,
            },
          });
        } catch {
          /* swallow: audit non deve rompere la request */
        }
      }),
    );
  }

  /**
   * Elimina chiavi sensibili e limita la dimensione del payload serializzato
   * per non gonfiare la tabella audit_logs.
   */
  private safeTrim(value: any, maxChars = 4000): any {
    if (value === null || value === undefined) return null;
    try {
      const cloned = JSON.parse(JSON.stringify(value));
      this.stripSensitive(cloned);
      const str = JSON.stringify(cloned);
      if (str.length <= maxChars) return cloned;
      return { __truncated: true, preview: str.slice(0, maxChars) };
    } catch {
      return null;
    }
  }

  private stripSensitive(obj: any): void {
    if (!obj || typeof obj !== 'object') return;
    const SENSITIVE = [
      'password',
      'passwordHash',
      'token',
      'access_token',
      'refreshToken',
      'verificationToken',
    ];
    for (const k of Object.keys(obj)) {
      if (SENSITIVE.includes(k)) {
        obj[k] = '[REDACTED]';
      } else if (typeof obj[k] === 'object') {
        this.stripSensitive(obj[k]);
      }
    }
  }
}
