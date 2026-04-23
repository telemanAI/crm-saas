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
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('AllExceptionsFilter');

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly systemErrorsService: SystemErrorsService,
  ) {}

  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request: any = ctx.getRequest();
    const response: any = ctx.getResponse();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorName = 'Error';
    let stackTrace: string | null = null;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any)?.message || exception.message;
      if (Array.isArray(message)) message = message.join('; ');
      errorName = exception.name || 'HttpException';
      stackTrace = exception.stack || null;
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
            // Non logghiamo body per evitare leak di password/PII.
          },
        })
        .catch((err) => this.logger.error(`[AllExceptionsFilter] log failed: ${err}`));
    }
  }
}
