import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    @InjectRepository(UserShopMembership) private readonly repo: Repository<UserShopMembership>,
    @InjectRepository(Tenant) private readonly shopRepo: Repository<Tenant>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Concede l'accesso ad uno Shop. Se esiste membership inattiva la riattiva (conservando storico).
   */
  async grantAccess(params: {
    userId: string;
    shopId: string;
    role: MembershipRole;
    permissions?: MembershipPermissions;
    invitedBy?: string;
  }): Promise<UserShopMembership> {
    const { userId, shopId, role, permissions, invitedBy } = params;

    let membership = await this.repo.findOne({ where: { userId, shopId } });
    if (membership) {
      membership.role = role;
      membership.permissions = permissions || DEFAULT_PERMISSIONS[role];
      membership.isActive = true;
      membership.leftAt = null;
      membership.joinedAt = new Date();
      if (invitedBy) membership.invitedBy = invitedBy;
      return this.repo.save(membership);
    }
    membership = this.repo.create({
      userId,
      shopId,
      role,
      permissions: permissions || DEFAULT_PERMISSIONS[role],
      isActive: true,
      joinedAt: new Date(),
      invitedBy: invitedBy || null,
    });
    return this.repo.save(membership);
  }

  /**
   * Rimuove un operatore (soft delete). Storia mantenuta + nota admin.
   */
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
    if (endOfRelationshipNote) membership.endOfRelationshipNote = endOfRelationshipNote;
    return this.repo.save(membership);
  }

  async updatePermissions(
    userId: string,
    shopId: string,
    permissions: MembershipPermissions,
  ): Promise<UserShopMembership> {
    const membership = await this.repo.findOne({ where: { userId, shopId } });
    if (!membership) throw new NotFoundException('Membership non trovata');
    membership.permissions = { ...membership.permissions, ...permissions };
    return this.repo.save(membership);
  }

  async updateRole(userId: string, shopId: string, role: MembershipRole): Promise<UserShopMembership> {
    const membership = await this.repo.findOne({ where: { userId, shopId } });
    if (!membership) throw new NotFoundException('Membership non trovata');
    membership.role = role;
    return this.repo.save(membership);
  }

  /** Shop a cui l'utente ha accesso attivo. */
  async findActiveShopsForUser(userId: string): Promise<Array<{ membership: UserShopMembership; shop: Tenant }>> {
    const memberships = await this.repo.find({
      where: { userId, isActive: true },
      relations: ['shop'],
      order: { joinedAt: 'DESC' },
    });
    return memberships.map(m => ({ membership: m, shop: m.shop }));
  }

  async findMembership(userId: string, shopId: string): Promise<UserShopMembership | null> {
    return this.repo.findOne({ where: { userId, shopId } });
  }

  async findActiveForUserAndShop(userId: string, shopId: string): Promise<UserShopMembership | null> {
    return this.repo.findOne({ where: { userId, shopId, isActive: true } });
  }

  async listShopMembers(shopId: string, includeInactive = false): Promise<UserShopMembership[]> {
    const where: any = { shopId };
    if (!includeInactive) where.isActive = true;
    return this.repo.find({
      where,
      relations: ['user'],
      order: { joinedAt: 'DESC' },
    });
  }

  /** Storico membership dell'utente in uno shop (per mostrare \"ha già lavorato qui\"). */
  async getHistoryInShop(userId: string, shopId: string): Promise<UserShopMembership | null> {
    return this.repo.findOne({
      where: { userId, shopId, isActive: false },
      order: { leftAt: 'DESC' },
    });
  }
}
