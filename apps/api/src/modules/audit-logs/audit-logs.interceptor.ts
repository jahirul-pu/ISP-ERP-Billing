import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogsService } from './audit-logs.service';

@Injectable()
export class AuditLogsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogsInterceptor.name);

  constructor(private readonly auditLogsService: AuditLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, ip, headers } = request;
    const userAgent = headers['user-agent'] || null;

    // Only intercept database mutations (POST, PUT, PATCH, DELETE)
    // and skip public/read-only routes or auth login routes.
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    const isLogin = url.includes('/auth/login');
    const isAuditLogs = url.includes('/audit-logs');

    if (!isMutation || isLogin || isAuditLogs) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (response) => {
        try {
          const userId = request.user?.id || request.user?.sub || null;

          // Parse entity name and target entity ID from request URL
          const urlParts = url.split('?')[0].split('/').filter((p: string) => p && p !== 'api');
          const entity = urlParts[0] || 'unknown';
          
          // Exclude helper/reserved route paths from being treated as entityId
          const reservedWords = ['new', 'search', 'bulk', 'stats', 'campaign', 'reconcile', 'sync', 'submit'];
          let entityId = null;
          if (urlParts[1] && !reservedWords.includes(urlParts[1])) {
            entityId = urlParts[1];
          }

          // If it's a create operation, sometimes the entityId is returned in the response object
          if (method === 'POST' && response && typeof response === 'object') {
            const dataObj = response.data || response;
            if (dataObj && typeof dataObj === 'object' && dataObj.id) {
              entityId = dataObj.id;
            }
          }

          // Determine action name based on request method
          let action = 'MUTATE';
          if (method === 'POST') action = 'CREATE';
          if (method === 'PUT' || method === 'PATCH') action = 'UPDATE';
          if (method === 'DELETE') action = 'DELETE';

          // Sanitize body to avoid leaking passwords/keys
          const newValues = this.sanitizeData(body);

          // Asynchronously log to the DB without blocking the request response
          this.auditLogsService.create({
            userId,
            action,
            entity,
            entityId,
            newValues,
            ipAddress: ip,
            userAgent,
          }).catch((err) => {
            this.logger.error(`Failed to write async audit log: ${err.message}`);
          });
        } catch (err) {
          this.logger.error(`Error executing audit logs interceptor: ${(err as any).message}`);
        }
      }),
    );
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = Array.isArray(data)
      ? [...data]
      : { ...data };

    const sensitiveKeys = [
      'password',
      'passwordConfirm',
      'oldPassword',
      'newPassword',
      'passwordHash',
      'twoFactorSecret',
      'token',
      'refreshToken',
      'accessToken',
      'secret',
    ];

    if (Array.isArray(sanitized)) {
      return sanitized.map(item => this.sanitizeData(item));
    }

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(k => key.toLowerCase().includes(k.toLowerCase()))) {
        sanitized[key] = '********';
      } else if (sanitized[key] && typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }

    return sanitized;
  }
}
