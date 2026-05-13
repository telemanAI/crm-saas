import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { Invite } from './entities/invite.entity';
import { User } from '../users/entities/user.entity';
import { UserShopMembership, DEFAULT_PERMISSIONS } from '../memberships/entities/user-shop-membership.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { MembershipsService } from '../memberships/memberships.service';
import { EmailService } from '../email/email.service';
import { JwtService } from '@nestjs/jwt';
import { CreateInviteDto, AcceptInviteViaPasswordDto } from './dto/invite.dto';

const INVITE_TTL_HOURS = 72;

@Injectable()
export class InvitesService {
  constructor(
    @InjectRepository(Invite) private readonly inviteRepo: Repository<Invite>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Tenant) private readonly shopRepo: Repository<Tenant>,
    @InjectRepository(UserShopMembership) private readonly membershipRepo: Repository<UserShopMembership>,
    private readonly membershipsService: MembershipsService,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
  ) {}

  async createInvite(shopId: string, invitedBy: string, dto: CreateInviteDto): Promise<Invite> {
    const shop = await this.shopRepo.findOne({ where: { id: shopId } });
    if (!shop) throw new NotFoundException('Negozio non trovato');

    const normalized = dto.email.trim().toLowerCase();

    // Check se esiste già membership attiva
    const existingUser = await this.userRepo.findOne({ where: { email: normalized } });
    if (existingUser) {
      const existing = await this.membershipRepo.findOne({
        where: { userId: existingUser.id, shopId, isActive: true },
      });
      if (existing) {
        throw new BadRequestException("L'utente è già membro attivo di questo negozio");
      }
    }

    // Se già esiste invito PENDING → rigenera token + scadenza (reinvia)
    let invite = await this.inviteRepo.findOne({
      where: { shopId, email: normalized, status: 'PENDING' },
    });

    const token = uuidv4().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);
    const permissions = dto.permissions || DEFAULT_PERMISSIONS[dto.role];

    // Recupera nota storica se operatore già licenziato in passato da questo shop
    let historyNote: string | null = null;
    if (existingUser) {
      const pastMembership = await this.membershipRepo.findOne({
        where: { userId: existingUser.id, shopId, isActive: false },
        order: { leftAt: 'DESC' },
      });
      if (pastMembership?.endOfRelationshipNote) {
        historyNote = pastMembership.endOfRelationshipNote;
      }
    }

    if (invite) {
      invite.token = token;
      invite.expiresAt = expiresAt;
      invite.role = dto.role;
      invite.permissions = permissions;
      invite.adminNote = dto.adminNote || historyNote;
      invite.invitedBy = invitedBy;
      await this.inviteRepo.save(invite);
    } else {
      invite = this.inviteRepo.create({
        token,
        shopId,
        email: normalized,
        role: dto.role,
        permissions,
        invitedBy,
        status: 'PENDING',
        expiresAt,
        adminNote: dto.adminNote || historyNote,
      });
      await this.inviteRepo.save(invite);
    }

    let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    // FIX: alcuni hosting (es. Render) generano URL con protocollo 'render://'
    // invece di 'https://'. Sostituisci per garantire link funzionanti.
    frontendUrl = frontendUrl.replace(/^render:\/\//, 'https://');
    const inviteUrl = `${frontendUrl}/invite/${token}`;
    await this.emailService.sendInviteEmail(
      normalized,
      inviteUrl,
      shop.name,
      shop.subscriptionCode,
      dto.role,
      historyNote,
    );

    return invite;
  }

  async resendInvite(inviteId: string): Promise<Invite> {
    const invite = await this.inviteRepo.findOne({ where: { id: inviteId }, relations: ['shop'] });
    if (!invite) throw new NotFoundException('Invito non trovato');
    if (invite.status !== 'PENDING') throw new BadRequestException('Invito non più valido');

    // Rigenera token + scadenza
    invite.token = uuidv4().replace(/-/g, '');
    invite.expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);
    await this.inviteRepo.save(invite);

    let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    frontendUrl = frontendUrl.replace(/^render:\/\//, 'https://');
    const inviteUrl = `${frontendUrl}/invite/${invite.token}`;
    await this.emailService.sendInviteEmail(
      invite.email,
      inviteUrl,
      invite.shop.name,
      invite.shop.subscriptionCode,
      invite.role,
      invite.adminNote,
    );
    return invite;
  }

  async revoke(inviteId: string): Promise<void> {
    await this.inviteRepo.update({ id: inviteId }, { status: 'REVOKED' });
  }

  async getByToken(token: string): Promise<Invite> {
    const invite = await this.inviteRepo.findOne({
      where: { token },
      relations: ['shop'],
    });
    if (!invite) throw new NotFoundException('Invito non valido');
    if (invite.status === 'ACCEPTED') throw new BadRequestException('Invito già accettato');
    if (invite.status === 'REVOKED') throw new BadRequestException('Invito revocato');
    if (invite.expiresAt < new Date()) {
      invite.status = 'EXPIRED';
      await this.inviteRepo.save(invite);
      throw new BadRequestException('Invito scaduto — chiedi al negozio un nuovo invito');
    }
    return invite;
  }

  /**
   * Accetta invito: se user non esiste, crea account (con password o social-only).
   * Se esiste, verifica email corrisponda e crea/riattiva membership.
   */
  async acceptInviteWithUserId(token: string, userId: string): Promise<UserShopMembership> {
    const invite = await this.getByToken(token);
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utente non trovato');
    if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new BadRequestException("L'email dell'invito non corrisponde al tuo account");
    }
    const membership = await this.membershipsService.grantAccess({
      userId: user.id,
      shopId: invite.shopId,
      role: invite.role,
      permissions: invite.permissions,
      invitedBy: invite.invitedBy,
    });
    invite.status = 'ACCEPTED';
    invite.acceptedAt = new Date();
    invite.acceptedByUserId = user.id;
    await this.inviteRepo.save(invite);
    return membership;
  }

  /** Accetta invito creando NUOVO account con password. */
  async acceptInviteCreatingUser(token: string, dto: AcceptInviteViaPasswordDto): Promise<User> {
    const invite = await this.getByToken(token);
    let user = await this.userRepo.findOne({ where: { email: invite.email } });
    if (user) throw new BadRequestException('Utente già esistente — effettua il login e poi accetta l\'invito');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);
    user = this.userRepo.create({
      email: invite.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: invite.role,
      tenantId: invite.shopId,
      emailVerified: true,
      provider: 'local',
      isActive: true,
    });
    await this.userRepo.save(user);

    await this.membershipsService.grantAccess({
      userId: user.id,
      shopId: invite.shopId,
      role: invite.role,
      permissions: invite.permissions,
      invitedBy: invite.invitedBy,
    });
    invite.status = 'ACCEPTED';
    invite.acceptedAt = new Date();
    invite.acceptedByUserId = user.id;
    await this.inviteRepo.save(invite);
    return user;
  }

  async listByShop(shopId: string): Promise<Invite[]> {
    return this.inviteRepo.find({
      where: { shopId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Accetta invito per utente loggato E restituisce subito una sessione fresca
   * (JWT con tenantId = shop invitato + lista shops aggiornata), così il
   * frontend può puntare direttamente al nuovo negozio senza passare da
   * /select-shop e senza usare il vecchio JWT che aveva il tenantId sbagliato.
   */
  async acceptInviteAndBuildSession(
    token: string,
    userId: string,
  ): Promise<{
    membership: UserShopMembership;
    access_token: string;
    user: any;
    shops: any[];
  }> {
    const membership = await this.acceptInviteWithUserId(token, userId);
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utente non trovato');

    const shopsData = await this.membershipsService.findActiveShopsForUser(userId);
    const shops = shopsData.map((s) => ({
      shopId: s.shop.id,
      name: s.shop.name,
      subscriptionCode: s.shop.subscriptionCode,
      role: s.membership.role,
      permissions: s.membership.permissions,
      companyId: s.shop.companyId,
    }));

    const access_token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: membership.role,
      tenantId: membership.shopId,
    });

    const { passwordHash, verificationToken, ...safeUser } = user as any;
    return { membership, access_token, user: safeUser, shops };
  }
}