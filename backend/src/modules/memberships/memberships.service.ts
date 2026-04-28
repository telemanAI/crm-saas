import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  UserShopMembership,
  DEFAULT_PERMISSIONS,
  MembershipPermissions,
  MembershipRole,
} from './entities/user-shop-membership.entity';
import { Tenant } from '../tenants/entities/tenant.entity';

@Injectable()
export class MembershipsService {
  constructor(
    @InjectRepository(UserShopMembership)
    private readonly repo: Repository<UserShopMembership>,
    @InjectRepository(Tenant)
    private readonly shopRepo: Repository<Tenant>,
  ) {}

  /**
   * Crea o riattiva una membership. FOUNDER riceve SEMPRE tutti i permessi a true.
   */
  async grantAccess(params: {
    userId: string;
    shopId: string;
    role: MembershipRole;
    permissions?: Partial<MembershipPermissions>;
    invitedBy?: string;
  }): Promise<UserShopMembership> {
    const existing = await this.repo.findOne({
      where: { userId: params.userId, shopId: params.shopId },
    });

    const basePerms = DEFAULT_PERMISSIONS[params.role] || DEFAULT_PERMISSIONS.OPERATOR;
    const finalPerms: MembershipPermissions =
      params.role === 'FOUNDER'
        ? { ...DEFAULT_PERMISSIONS.FOUNDER }
        : ({ ...basePerms, ...(params.permissions || {}) } as MembershipPermissions);

    if (existing) {
      existing.role = params.role;
      existing.permissions = finalPerms;
      existing.isActive = true;
      existing.leftAt = null;
      existing.endOfRelationshipNote = null;
      if (params.invitedBy) existing.invitedBy = params.invitedBy;
      return this.repo.save(existing);
    }

    const m = this.repo.create({
      userId: params.userId,
      shopId: params.shopId,
      role: params.role,
      permissions: finalPerms,
      isActive: true,
      invitedBy: params.invitedBy ?? null,
    });
    return this.repo.save(m);
  }

  /**
   * Trova la membership ATTIVA per un utente in uno specifico shop.
   * Auto-heal rafforzato:
   *  - FOUNDER: riallinea SEMPRE i permessi al default (tutti true).
   *    Fix del bug "FOUNDER 9/11 permessi attivi" che causava
   *    il blocco "Permesso mancante: canChangeUserRoles".
   *  - ADMIN: se permessi vuoti, popola default ADMIN.
   */
  async findActiveForUserAndShop(
    userId: string,
    shopId: string,
  ): Promise<UserShopMembership | null> {
    if (!userId || !shopId) return null;
    const membership = await this.repo.findOne({
      where: { userId, shopId, isActive: true },
    });
    if (!membership) return null;

    if (membership.role === 'FOUNDER') {
      const target = DEFAULT_PERMISSIONS.FOUNDER;
      const current = (membership.permissions || {}) as MembershipPermissions;
      const needsHeal = Object.keys(target).some(
        (k) => (current as any)[k] !== true,
      );
      if (needsHeal) {
        membership.permissions = { ...target };
        await this.repo.save(membership);
      }
      return membership;
    }

    if (membership.role === 'ADMIN' && this.hasEmptyPermissions(membership)) {
      membership.permissions = { ...DEFAULT_PERMISSIONS.ADMIN };
      await this.repo.save(membership);
    } else {
      // Self-healing soft per OPERATOR/ADMIN:
      // Se nel codebase sono stati aggiunti nuovi permessi (es. canManageTeam,
      // canViewCompetitions, canSellDevices, ...) che NON esistono nel record DB,
      // aggiungili con il valore di default per quel ruolo.
      // I permessi già personalizzati dal founder NON vengono toccati.
      const defaults = DEFAULT_PERMISSIONS[membership.role];
      const current = (membership.permissions || {}) as MembershipPermissions;
      const missingKeys = Object.keys(defaults).filter(
        (k) => !(k in current),
      );
      if (missingKeys.length > 0) {
        const merged = { ...current };
        for (const k of missingKeys) {
          (merged as any)[k] = (defaults as any)[k];
        }
        membership.permissions = merged;
        await this.repo.save(membership);
      }
    }
    return membership;
  }

  private hasEmptyPermissions(m: UserShopMembership): boolean {
    return !m.permissions || Object.keys(m.permissions).length === 0;
  }

  /**
   * Tutte le membership ATTIVE di un utente con dati shop.
   */
  async findActiveShopsForUser(
    userId: string,
  ): Promise<Array<{ membership: UserShopMembership; shop: Tenant }>> {
    const memberships = await this.repo.find({
      where: { userId, isActive: true },
      order: { joinedAt: 'ASC' },
    });
    if (memberships.length === 0) return [];

    const shopIds = memberships.map((m) => m.shopId);
    const shops = await this.shopRepo.findByIds(shopIds);
    const shopMap = new Map(shops.map((s) => [s.id, s]));

    for (const m of memberships) {
      if (m.role === 'FOUNDER') {
        const target = DEFAULT_PERMISSIONS.FOUNDER;
        const needsHeal = Object.keys(target).some(
          (k) => (m.permissions as any)?.[k] !== true,
        );
        if (needsHeal) {
          m.permissions = { ...target };
          await this.repo.save(m);
        }
      } else if (m.role === 'ADMIN' && this.hasEmptyPermissions(m)) {
        m.permissions = { ...DEFAULT_PERMISSIONS.ADMIN };
        await this.repo.save(m);
      } else {
        // Self-healing soft: aggiungi permessi nuovi mancanti senza sovrascrivere
        const defaults = DEFAULT_PERMISSIONS[m.role];
        const current = (m.permissions || {}) as MembershipPermissions;
        const missingKeys = Object.keys(defaults).filter((k) => !(k in current));
        if (missingKeys.length > 0) {
          const merged = { ...current };
          for (const k of missingKeys) {
            (merged as any)[k] = (defaults as any)[k];
          }
          m.permissions = merged;
          await this.repo.save(m);
        }
      }
    }

    return memberships
      .map((m) => ({ membership: m, shop: shopMap.get(m.shopId) }))
      .filter((x) => !!x.shop) as Array<{
      membership: UserShopMembership;
      shop: Tenant;
    }>;
  }

  /**
   * Lista membri di uno shop. Se includeInactive=true include ex-operatori.
   */
  async listShopMembers(
    shopId: string,
    includeInactive = false,
  ): Promise<UserShopMembership[]> {
    const where: any = { shopId };
    if (!includeInactive) where.isActive = true;
    return this.repo.find({
      where,
      relations: ['user'],
      order: { isActive: 'DESC', joinedAt: 'ASC' },
    });
  }

  /**
   * Aggiorna ruolo di una membership.
   * - FOUNDER: permessi sempre a tutti true
   * - Altrimenti: se cambio da FOUNDER ad altro, o se permessi vuoti, reset default
   */
  async updateRole(
    shopId: string,
    userId: string,
    newRole: MembershipRole,
  ): Promise<UserShopMembership> {
    const m = await this.repo.findOne({ where: { shopId, userId } });
    if (!m) throw new NotFoundException('Membership non trovata');
    const oldRole = m.role;
    m.role = newRole;

    if (newRole === 'FOUNDER') {
      m.permissions = { ...DEFAULT_PERMISSIONS.FOUNDER };
    } else if (oldRole === 'FOUNDER' || this.hasEmptyPermissions(m)) {
      m.permissions = { ...DEFAULT_PERMISSIONS[newRole] };
    }
    return this.repo.save(m);
  }

  /**
   * Aggiorna permessi granulari. FOUNDER forzato a tutti true.
   */
  async updatePermissions(
    shopId: string,
    userId: string,
    permissions: Partial<MembershipPermissions>,
  ): Promise<UserShopMembership> {
    const m = await this.repo.findOne({ where: { shopId, userId } });
    if (!m) throw new NotFoundException('Membership non trovata');

    if (m.role === 'FOUNDER') {
      m.permissions = { ...DEFAULT_PERMISSIONS.FOUNDER };
      return this.repo.save(m);
    }
    m.permissions = {
      ...(m.permissions as MembershipPermissions),
      ...(permissions as Partial<MembershipPermissions>),
    } as MembershipPermissions;
    return this.repo.save(m);
  }

  async revokeAccess(
    shopId: string,
    userId: string,
    endOfRelationshipNote?: string,
  ): Promise<void> {
    const m = await this.repo.findOne({ where: { shopId, userId } });
    if (!m) throw new NotFoundException('Membership non trovata');
    if (m.role === 'FOUNDER') {
      throw new BadRequestException(
        'Impossibile revocare il FOUNDER del negozio. Trasferisci prima la proprietà.',
      );
    }
    m.isActive = false;
    m.leftAt = new Date();
    if (endOfRelationshipNote !== undefined) {
      m.endOfRelationshipNote = endOfRelationshipNote;
    }
    await this.repo.save(m);
  }

  async reactivateAccess(
    shopId: string,
    userId: string,
  ): Promise<UserShopMembership> {
    const m = await this.repo.findOne({ where: { shopId, userId } });
    if (!m) throw new NotFoundException('Membership non trovata');
    m.isActive = true;
    m.leftAt = null;
    return this.repo.save(m);
  }

  /**
   * Storia membership di un utente in uno specifico shop (legacy signature
   * attesa dal MembershipsController esistente).
   */
  async getHistoryInShop(
    userId: string,
    shopId: string,
  ): Promise<UserShopMembership[]> {
    return this.repo.find({
      where: { userId, shopId },
      order: { joinedAt: 'DESC' },
    });
  }

  async getHistoryForUser(userId: string): Promise<UserShopMembership[]> {
    return this.repo.find({
      where: { userId },
      relations: ['shop'],
      order: { joinedAt: 'DESC' },
    });
  }
}
