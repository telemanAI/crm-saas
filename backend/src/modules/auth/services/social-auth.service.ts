import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { User, AuthProvider } from '../../users/entities/user.entity';
import { PendingRegistration } from '../entities/pending-registration.entity';
import { MembershipsService } from '../../memberships/memberships.service';
import { CompaniesService } from '../../companies/companies.service';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { CompleteRegistrationDto } from '../dto/auth-flow.dto';
import { InvitesService } from '../../invites/invites.service';

const PENDING_TTL_MINUTES = 30;

interface SocialProfile {
  provider: AuthProvider;
  providerId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

@Injectable()
export class SocialAuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(PendingRegistration) private readonly pendingRepo: Repository<PendingRegistration>,
    @InjectRepository(Tenant) private readonly shopRepo: Repository<Tenant>,
    private readonly jwtService: JwtService,
    private readonly membershipsService: MembershipsService,
    private readonly companiesService: CompaniesService,
    private readonly invitesService: InvitesService,
  ) {}

  async handleSocialOrOtpLogin(profile: SocialProfile): Promise<
    | { status: 'logged_in'; token: string; user: any; shops: any[] }
    | { status: 'pending'; pendingToken: string; email: string; firstName?: string; lastName?: string }
  > {
    const email = profile.email.trim().toLowerCase();
    if (!email) throw new BadRequestException('Email mancante dal provider');

    let user = await this.userRepo.findOne({ where: { email } });

    if (user) {
      let updated = false;
      if (profile.provider !== 'otp' && user.provider === 'local') {
        user.provider = profile.provider;
        user.providerId = profile.providerId;
        updated = true;
      }
      if (!user.avatarUrl && profile.avatarUrl) {
        user.avatarUrl = profile.avatarUrl;
        updated = true;
      }
      if (!user.emailVerified) {
        user.emailVerified = true;
        updated = true;
      }
      user.lastLogin = new Date();
      if (updated || true) await this.userRepo.save(user);

      const shopsData = await this.membershipsService.findActiveShopsForUser(user.id);

      // FIX: se non ci sono membership attive, verifica fallback legacy o blocca
      if (shopsData.length === 0) {
        if (user.tenantId) {
          const legacyMembership = await this.membershipsService.findActiveForUserAndShop(user.id, user.tenantId);
          if (!legacyMembership) {
            throw new UnauthorizedException('Accesso revocato a tutti i negozi. Contatta l\'amministratore.');
          }
          const legacyShop = await this.shopRepo.findOne({ where: { id: user.tenantId } });
          if (legacyShop) {
            shopsData.push({ membership: legacyMembership, shop: legacyShop });
          }
        } else {
          throw new UnauthorizedException('Nessun negozio attivo associato a questo account.');
        }
      }

      const activeShopId = shopsData[0]?.shop.id || user.tenantId || null;
      const activeRole = shopsData[0]?.membership.role || user.role;

      const token = this.signToken({
        sub: user.id,
        email: user.email,
        role: activeRole,
        tenantId: activeShopId,
      });
      return {
        status: 'logged_in',
        token,
        user: { ...this.sanitizeUser(user), role: activeRole, tenantId: activeShopId },
        shops: this.serializeShops(shopsData),
      };
    }

    // User non esiste → crea pending registration
    const pendingToken = uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + PENDING_TTL_MINUTES * 60 * 1000);
    const pending = this.pendingRepo.create({
      token: pendingToken,
      email,
      provider: profile.provider as any,
      providerId: profile.providerId,
      firstName: profile.firstName || null,
      lastName: profile.lastName || null,
      avatarUrl: profile.avatarUrl || null,
      expiresAt,
    });
    await this.pendingRepo.save(pending);

    return {
      status: 'pending',
      pendingToken,
      email,
      firstName: profile.firstName,
      lastName: profile.lastName,
    };
  }

  async completeRegistration(dto: CompleteRegistrationDto): Promise<{ token: string; user: any; shops: any[] }> {
    const pending = await this.pendingRepo.findOne({ where: { token: dto.pendingToken } });
    if (!pending) throw new UnauthorizedException('Sessione di registrazione non valida o scaduta');
    if (pending.expiresAt < new Date()) {
      await this.pendingRepo.delete({ id: pending.id });
      throw new UnauthorizedException('Sessione di registrazione scaduta, ricomincia');
    }

    let user = await this.userRepo.findOne({ where: { email: pending.email } });
    if (user) {
      await this.pendingRepo.delete({ id: pending.id });
      const shopsData = await this.membershipsService.findActiveShopsForUser(user.id);
      const activeShopId = shopsData[0]?.shop.id || user.tenantId;
      const activeRole = shopsData[0]?.membership.role || user.role;
      const token = this.signToken({
        sub: user.id,
        email: user.email,
        role: activeRole,
        tenantId: activeShopId,
      });
      return { token, user: { ...this.sanitizeUser(user), role: activeRole, tenantId: activeShopId }, shops: this.serializeShops(shopsData) };
    }

    user = this.userRepo.create({
      email: pending.email,
      firstName: pending.firstName || '',
      lastName: pending.lastName || '',
      avatarUrl: pending.avatarUrl,
      provider: pending.provider as AuthProvider,
      providerId: pending.providerId,
      emailVerified: true,
      role: dto.role === 'shop_owner' ? 'FOUNDER' : 'OPERATOR',
      isActive: true,
      passwordHash: null,
    });
    user = await this.userRepo.save(user);

    if (dto.role === 'shop_owner') {
      if (!dto.shopName) throw new BadRequestException('Nome del negozio obbligatorio');
      const company = await this.companiesService.resolveOrCreateForNewShop({
        legalName: dto.legalName || dto.shopName,
        vatNumber: dto.vatNumber,
        currentUserId: user.id,
      });
      const shop = await this.createShopUnderCompany({
        name: dto.shopName,
        companyId: company.id,
        vatNumber: dto.vatNumber,
      });
      user.tenantId = shop.id;
      await this.userRepo.save(user);
      await this.membershipsService.grantAccess({
        userId: user.id,
        shopId: shop.id,
        role: 'FOUNDER',
      });
    } else if (dto.role === 'operator') {
      if (!dto.inviteToken) {
        throw new BadRequestException('Gli operatori possono registrarsi solo tramite invito');
      }
      await this.invitesService.acceptInviteWithUserId(dto.inviteToken, user.id);
    }

    await this.pendingRepo.delete({ id: pending.id });
    const shopsData = await this.membershipsService.findActiveShopsForUser(user.id);
    const activeShopId = shopsData[0]?.shop.id || user.tenantId;
    const activeRole = shopsData[0]?.membership.role || user.role;
    const token = this.signToken({
      sub: user.id,
      email: user.email,
      role: activeRole,
      tenantId: activeShopId,
    });
    return { token, user: { ...this.sanitizeUser(user), role: activeRole, tenantId: activeShopId }, shops: this.serializeShops(shopsData) };
  }

  async switchActiveShop(
    userId: string,
    shopId: string,
  ): Promise<{ token: string; user: any; shops: any[] }> {
    const membership = await this.membershipsService.findActiveForUserAndShop(userId, shopId);
    if (!membership) throw new UnauthorizedException('Non hai accesso a questo negozio');
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    // FIX M1: persiste l'ultimo shop attivo per la prossima sessione
    if (user.lastActiveShopId !== shopId) {
      user.lastActiveShopId = shopId;
      await this.userRepo.save(user);
    }

    const token = this.signToken({
      sub: user.id,
      email: user.email,
      role: membership.role,
      tenantId: shopId,
    });

    const shopsData = await this.membershipsService.findActiveShopsForUser(userId);
    return {
      token,
      user: {
        ...this.sanitizeUser(user),
        role: membership.role,
        tenantId: shopId,
      },
      shops: this.serializeShops(shopsData),
    };
  }

  private async createShopUnderCompany(params: { name: string; companyId: string; vatNumber?: string | null }): Promise<Tenant> {
    let code: string;
    let exists: Tenant | null;
    do {
      code = Math.floor(10000 + Math.random() * 90000).toString();
      exists = await this.shopRepo.findOne({ where: { subscriptionCode: code } });
    } while (exists);

    const baseSlug = params.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'shop';
    let slug = baseSlug;
    let suffix = 0;
    while (await this.shopRepo.findOne({ where: { slug } })) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    const shop = this.shopRepo.create({
      name: params.name,
      subscriptionCode: code,
      slug,
      vatNumber: params.vatNumber || null,
      companyId: params.companyId,
      planType: 'basic',
      subscriptionStatus: 'trial',
      isActive: true,
    });
    return this.shopRepo.save(shop);
  }

  private sanitizeUser(u: User) {
    const { passwordHash, verificationToken, ...rest } = u as any;
    return rest;
  }

  private serializeShops(shops: Array<{ membership: any; shop: Tenant }>) {
    return shops.map(s => ({
      shopId: s.shop.id,
      name: s.shop.name,
      subscriptionCode: s.shop.subscriptionCode,
      role: s.membership.role,
      permissions: s.membership.permissions,
      companyId: s.shop.companyId,
    }));
  }

  private signToken(payload: any): string {
    return this.jwtService.sign(payload);
  }

  async cleanupExpiredPending(): Promise<number> {
    const res = await this.pendingRepo.delete({ expiresAt: LessThan(new Date()) });
    return res.affected || 0;
  }
}