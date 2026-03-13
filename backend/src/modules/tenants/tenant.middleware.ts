import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user;
    
    if (user && user.tenantId) {
      req.headers['x-tenant-id'] = user.tenantId;
    }
    
    next();
  }
}