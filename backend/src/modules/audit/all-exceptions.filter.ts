import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { SystemErrorsService } from './system-errors.service';

/**
 * Filtro globale che cattura TUTTE le eccezioni non gestite.
 *
 * Policy di logging:
 *   - 5xx / eccezioni inattese → severity=error (critico)
 *   - 4xx escluse 401/403      → severity=warning (input/validazione)
 *   - 401/403                  → severity=info (tentativi accesso)
 *   - Risposte 2xx/3xx         → non loggate (non passano da qui)
 *
 * Mantiene il comportamento standard di Nest per la risposta HTTP.
 * Il logging al DB è fire-and-forget (non blocca mai la risposta al client).
 *
 * fix-final5 — sanitizza `QueryFailedError` di TypeORM:
 *   senza questa logica errori tipo `null value in column "tenantId"` o
 *   `duplicate key violates unique constraint` arrivavano testualmente al
 *   browser, esponendo schema interno e UX scadente. Ora il client riceve
 *   un messaggio italiano leggibile, mentre lo stack completo (con il
 *   messaggio Postgres originale) viene loggato in `system_errors` per
 *   debug dal pannello SUPER_ADMIN.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('AllExceptionsFilter');

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly systemErrorsService: SystemErrorsService,
  ) {}

  /** Tenta di tradurre un errore Postgres in un messaggio user-friendly. */
  private translateDbError(exception: any): { status: number; message: string } {
    const code: string | undefined = exception?.code || exception?.driverError?.code;
    const detail: string =
      exception?.detail || exception?.driverError?.detail || exception?.message || '';
    const lower = String(detail).toLowerCase();

    // Codici Postgres SQLSTATE comuni
    switch (code) {
      case '23505': // unique_violation
        return {
          status: HttpStatus.CONFLICT,
          message: lower.includes('sku')
            ? 'Codice SKU già esistente. Modificalo e riprova.'
            : 'Esiste già un record con questi dati. Verifica e riprova.',
        };
      case '23502': // not_null_violation
        return {
          status: HttpStatus.BAD_REQUEST,
          message:
            'Dati mancanti o sessione scaduta. Effettua di nuovo il login e ritenta.',
        };
      case '23503': // foreign_key_violation
        return {
          status: HttpStatus.BAD_REQUEST,
          message:
            'Riferimento non valido (gruppo/cliente/offerta inesistente). Aggiorna la pagina e riprova.',
        };
      case '23514': // check_violation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Valore non valido per un campo (controllo formato/range).',
        };
      case '22001': // string_data_right_truncation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Uno dei valori è troppo lungo per essere salvato. Riducilo e riprova.',
        };
      case '22P02': // invalid_text_representation (es. UUID malformato)
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Identificatore non valido. Aggiorna la pagina.',
        };
      case '40P01': // deadlock_detected
        return {
          status: HttpStatus.CONFLICT,
          message: 'Conflitto di scrittura. Attendi qualche secondo e riprova.',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Errore di salvataggio sul database. Riprova o contatta l\'assistenza.',
        };
    }
  }

  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request: any = ctx.getRequest();
    const response: any = ctx.getResponse();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorName = 'Error';
    let stackTrace: string | null = null;
    /**
     * Dettaglio originale (sql + payload Postgres). Va SOLO al log su DB,
     * MAI al client. Importante per il debug ex-post sull'admin panel.
     */
    let dbDetail: string | null = null;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any)?.message || exception.message;
      if (Array.isArray(message)) message = message.join('; ');
      errorName = exception.name || 'HttpException';
      stackTrace = exception.stack || null;
    } else if (
      // QueryFailedError (TypeORM) o qualsiasi cosa con un SQLSTATE riconoscibile
      (exception as any)?.constructor?.name === 'QueryFailedError' ||
      (exception as any)?.code?.length === 5
    ) {
      const ex = exception as any;
      const translated = this.translateDbError(ex);
      statusCode = translated.status;
      message = translated.message;
      errorName = 'DatabaseError';
      stackTrace = ex.stack || null;
      // Dettaglio per il log DB (solo super-admin lo vede)
      dbDetail = JSON.stringify({
        code: ex.code,
        detail: ex.detail,
        constraint: ex.constraint,
        table: ex.table,
        column: ex.column,
        rawMessage: ex.message,
      }).slice(0, 1500);
    } else if (exception instanceof Error) {
      message = exception.message;
      errorName = exception.name || 'Error';
      stackTrace = exception.stack || null;
    }

    // Risposta standard Nest-compatible
    const responseBody = {
      statusCode,
      timestamp: new Date().toISOString(),
      path: request?.url,
      message,
    };

    try {
      httpAdapter.reply(response, responseBody, statusCode);
    } catch (replyErr) {
      this.logger.error(`[AllExceptionsFilter] reply failed: ${replyErr}`);
    }

    // Fire-and-forget: logga al DB solo per status >= 400.
    if (statusCode >= 400) {
      let severity: 'error' | 'warning' | 'info' = 'error';
      if (statusCode === 401 || statusCode === 403) severity = 'info';
      else if (statusCode < 500) severity = 'warning';

      const user = (request as any)?.user || {};
      this.systemErrorsService
        .logError({
          tenantId: user.tenantId || null,
          userId: user.id || user.userId || user.sub || null,
          statusCode,
          method: String(request?.method || 'UNKNOWN'),
          endpoint: String(request?.originalUrl || request?.url || 'unknown'),
          errorMessage: String(message).slice(0, 2000),
          errorName,
          stackTrace: statusCode >= 500 ? stackTrace : null, // stack solo per 5xx
          severity,
          ipAddress:
            String(
              request?.headers?.['x-forwarded-for'] ||
                request?.ip ||
                request?.connection?.remoteAddress ||
                '',
            ) || null,
          userAgent: String(request?.headers?.['user-agent'] || '') || null,
          metadata: {
            query: request?.query,
            // dbDetail è cruciale per debug "perché 500": include SQL + colonna
            dbDetail,
            // Non logghiamo body per evitare leak di password/PII.
          },
        })
        .catch((err) => this.logger.error(`[AllExceptionsFilter] log failed: ${err}`));
    }
  }
}
