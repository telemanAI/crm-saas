import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { UserShopMembership } from '../memberships/entities/user-shop-membership.entity';
import { User } from '../users/entities/user.entity';

/**
 * Strategy JWT con fallback robusto per tenantId.
 *
 * Strategia di risoluzione (in ordine):
 *   1. payload.tenantId (caso normale, JWT recente)
 *   1b. payload.shopId (fallback se il JWT usa shopId al posto di tenantId)
 *   2. header `X-Active-Shop-Id` inviato dal frontend ShopSwitcher
 *   3. prima membership attiva dell'utente nel DB
 *   4. PHASE G.2: `users.tenant_id` direttamente (founder legacy senza riga in user_shop_memberships)
 *   5. null (route che richiedono tenantId daranno 400 esplicito)
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(UserShopMembership)
    private readonly membershipRepo: Repository<UserShopMembership>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'super-secret',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    if (!payload.sub) {
      throw new UnauthorizedException('Token non contiene ID utente');
    }

    // CHIRURGIA 1: cattura sia tenantId che shopId dal JWT
    let tenantId: string | null = (payload.tenantId || payload.shopId || null);

    // PHASE A — BUG #2: fallback se tenantId mancante nel JWT
    if (!tenantId) {
      // 2. Header X-Active-Shop-Id dal frontend
      const headerShopId = (req?.headers?.['x-active-shop-id'] as string) || null;
      if (headerShopId && /^[0-9a-f-]{36}$/i.test(headerShopId)) {
        // Verifica che l'utente abbia membership attiva su quello shop
        const m = await this.membershipRepo.findOne({
          where: { userId: payload.sub, shopId: headerShopId, isActive: true },
        });
        if (m) tenantId = headerShopId;
      }

      // 3. Prima membership attiva
      if (!tenantId) {
        const first = await this.membershipRepo.findOne({
          where: { userId: payload.sub, isActive: true },
          order: { joinedAt: 'ASC' },
        });
        if (first) tenantId = first.shopId;
      }

      // 4. PHASE G.2: users.tenant_id (founder legacy senza membership)
      if (!tenantId) {
        const u = await this.userRepo.findOne({
          where: { id: payload.sub },
          select: ['id', 'tenantId'],
        });
        if (u?.tenantId) {
          tenantId = u.tenantId;
          // eslint-disable-next-line no-console
          console.warn(
            `[JwtStrategy] tenantId fallback users.tenantId per user ${payload.sub} (${payload.email}) — considera di creare membership esplicita`,
          );
        }
      }
    }

    return {
      id: payload.sub,
      userId: payload.sub,
      sub: payload.sub,                 // CHIRURGIA 2: retro-compat per req.user.sub
      email: payload.email,
      tenantId,
      role: payload.role,
      isSuperAdmin: payload.isSuperAdmin === true,
      isImpersonated: payload.isImpersonated === true,
    };
  }
}