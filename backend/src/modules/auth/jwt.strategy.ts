import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { UserShopMembership } from '../memberships/entities/user-shop-membership.entity';

/**
 * Strategy JWT con fallback robusto per tenantId.
 *
 * Caso d'uso del fallback (PHASE A — BUG #2):
 * Se il JWT è stato emesso prima della Tappa 0 multi-shop, può avere
 * `tenantId: null`. In quel caso le route che fanno INSERT con tenantId
 * crashano (es. inventory_items).
 *
 * Strategia di risoluzione (in ordine):
 *   1. payload.tenantId (caso normale, JWT recente)
 *   2. header `X-Active-Shop-Id` inviato dal frontend ShopSwitcher
 *   3. prima membership attiva dell'utente nel DB
 *   4. null (route che richiedono tenantId daranno 400 esplicito)
 *
 * Così l'utente non deve fare logout/login e il sistema resta robusto
 * a JWT non aggiornati.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(UserShopMembership)
    private readonly membershipRepo: Repository<UserShopMembership>,
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

    let tenantId: string | null = payload.tenantId ?? null;

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
    }

    return {
      id: payload.sub,
      userId: payload.sub,
      email: payload.email,
      tenantId,
      role: payload.role,
      isSuperAdmin: payload.isSuperAdmin === true,
      isImpersonated: payload.isImpersonated === true,
    };
  }
}
