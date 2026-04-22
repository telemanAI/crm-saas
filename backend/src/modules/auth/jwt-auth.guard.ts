import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token mancante');
    }

    const token = authHeader.substring(7);

    try {
      const payload = this.jwtService.verify(token);
      request.user = {
        id: payload.sub,
        userId: payload.sub,
        sub: payload.sub,
        email: payload.email,
        tenantId: payload.tenantId,
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
