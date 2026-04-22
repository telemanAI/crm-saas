import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import {
  UserShopMembership,
  MembershipRole,
  MembershipPermissions,
  DEFAULT_PERMISSIONS,
} from './entities/user-shop-membership.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class MembershipsService {
  constructor(
    @InjectRepository(UserShopMembership)
    private readonly repo: Repository<UserShopMembership>,
    @InjectRepository(Tenant)
    private readonly shopRepo: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async grantAccess(params: {
    userId: string;
    shopId: string;
    role: MembershipRole;
    permissions?: MembershipPermissions;
    invitedBy?: string;
  }): Promise<UserShopMembership> {
    const { userId, shopId, role, permissions, invitedBy } = params;

    const existing = await this.repo.findOne({ where: { userId, shopId } });
    if (existing) {
      existing.role = role;
      existing.permissions = permissions ?? DEFAULT_PERMISSIONS[role];
      existing.isActive = true;
      existing.leftAt = null;
      existing.joinedAt = new Date();
      if (invitedBy) existing.invitedBy = invitedBy;
      return this.repo.save(existing);
    }

    const membership = this.repo.create({
      userId,
      shopId,
      role,
      permissions: permissions ?? DEFAULT_PERMISSIONS[role],
      isActive: true,
      joinedAt: new Date(),
      invitedBy: invitedBy || null,
    });
    return this.repo.save(membership);
  }

  async revokeAccess(
    userId: string,
    shopId: string,
    endOfRelationshipNote?: string,
  ): Promise<UserShopMembership> {
    const membership = await this.repo.findOne({ where: { userId, shopId } });
    if (!membership) throw new NotFoundException('Membership non trovata');
    if (membership.role === 'FOUNDER') {
      throw new BadRequestException('Impossibile rimuovere il FOUNDER del negozio');
    }

    membership.isActive = false;
    membership.leftAt = new Date();
    if (endOfRelationshipNote) {
      membership.endOfRelationshipNote = endOfRelationshipNote;
    }
    return this.repo.save(membership);
  }

  async updatePermissions(
    userId: string,
    shopId: string,
    permissions: MembershipPermissions,
  ): Promise<UserShopMembership> {
    const membership = await this.repo.findOne({ where: { userId, shopId } });
    if (!membership) throw new NotFoundException('Membership non trovata');

    // TypeORM non rileva sempre come dirty le mutazioni su campi jsonb.
    // Usiamo update() esplicito per forzare la persistenza.
    const merged: MembershipPermissions = {
      ...(membership.permissions || {}),
      ...permissions,
    };
    await this.repo.update({ userId, shopId }, { permissions: merged });

    membership.permissions = merged;
    return membership;
  }

  async updateRole(
    userId: string,
    shopId: string,
    role: MembershipRole,
  ): Promise<UserShopMembership> {
    const membership = await this.repo.findOne({ where: { userId, shopId } });
    if (!membership) throw new NotFoundException('Membership non trovata');

    membership.role = role;
    return this.repo.save(membership);
  }

  async findActiveShopsForUser(
    userId: string,
  ): Promise<Array<{ membership: UserShopMembership; shop: Tenant }>> {
    const memberships = await this.repo.find({
      where: { userId, isActive: true },
      relations: ['shop'],
      order: { joinedAt: 'DESC' },
    });

    // Auto-heal batch: ripristina i default per FOUNDER/ADMIN con permessi vuoti (record legacy)
    const toHeal = memberships.filter(
      (m) => this.hasEmptyPermissions(m) && (m.role === 'FOUNDER' || m.role === 'ADMIN'),
    );

    if (toHeal.length > 0) {
      for (const m of toHeal) {
        m.permissions = DEFAULT_PERMISSIONS[m.role];
      }
      await this.repo.save(toHeal);
    }

    return memberships.map((m) => ({ membership: m, shop: m.shop }));
  }

  async findMembership(
    userId: string,
    shopId: string,
  ): Promise<UserShopMembership | null> {
    return this.repo.findOne({ where: { userId, shopId } });
  }

  async findActiveForUserAndShop(
    userId: string,
    shopId: string,
  ): Promise<UserShopMembership | null> {
    const membership = await this.repo.findOne({
      where: { userId, shopId, isActive: true },
    });
    if (!membership) return null;

    if (this.hasEmptyPermissions(membership) && (membership.role === 'FOUNDER' || membership.role === 'ADMIN')) {
      membership.permissions = DEFAULT_PERMISSIONS[membership.role];
      await this.repo.save(membership);
    }

    return membership;
  }

  async listShopMembers(
    shopId: string,
    includeInactive = false,
  ): Promise<UserShopMembership[]> {
    const where: FindOptionsWhere<UserShopMembership> = { shopId };
    if (!includeInactive) {
      where.isActive = true;
    }
    return this.repo.find({
      where,
      relations: ['user'],
      order: { joinedAt: 'DESC' },
    });
  }

  async getHistoryInShop(
    userId: string,
    shopId: string,
  ): Promise<UserShopMembership | null> {
    return this.repo.findOne({
      where: { userId, shopId, isActive: false },
      order: { leftAt: 'DESC' },
    });
  }

  private hasEmptyPermissions(m: UserShopMembership): boolean {
    return !m.permissions || Object.keys(m.permissions).length === 0;
  }
}
