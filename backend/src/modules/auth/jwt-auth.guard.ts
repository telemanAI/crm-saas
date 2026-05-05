import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // Supporta sia header Bearer che query param ?token= (necessario per SSE/EventSource)
    let token: string | null = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (request.query?.token) {
      token = String(request.query.token);
    }

    if (!token) {
      throw new UnauthorizedException('Token mancante');
    }

    try {
      const payload = this.jwtService.verify(token);

      if (!payload.sub) {
        throw new UnauthorizedException('Token non contiene ID utente');
      }

      // CHIRURGIA: fallback tenantId/shopId per token vecchi o multi-shop
      const tenantId = payload.tenantId || payload.shopId || null;

      request.user = {
        id: payload.sub,
        userId: payload.sub,
        sub: payload.sub,
        email: payload.email,
        tenantId,
        companyId: payload.companyId || null,
        role: payload.role,
        isSuperAdmin: payload.isSuperAdmin || false,
        isImpersonated: payload.isImpersonated || false,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Token non valido');
    }
  }
}