// backend/src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { TenantsService } from '../tenants/tenants.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SuperAdminLoginDto } from './dto/super-admin-login.dto';
import { FastLoginDto } from './dto/fast-login.dto';
import { RegisterShopOwnerDto } from './dto/auth-flow.dto';
import { EmailService } from '../email/email.service';
import { MembershipsService } from '../memberships/memberships.service';
import { CompaniesService } from '../companies/companies.service';
import { User } from '../users/entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { v4 as uuidv4 } from 'uuid';

const SUPER_ADMIN_CODE = '847293516';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private tenantsService: TenantsService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private membershipsService: MembershipsService,
    private companiesService: CompaniesService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Tenant) private readonly shopRepo: Repository<Tenant>,
  ) {}

  async validateUser(email: string, pass: string, subscriptionCode: string): Promise<any> {
    const tenant = await this.tenantsService.findBySubscriptionCode(subscriptionCode);
    if (!tenant) throw new UnauthorizedException('Codice negozio non valido');

    const user = await this.usersService.findByEmail(email, tenant.id);
    if (!user) throw new UnauthorizedException('Credenziali non valide');
    if (!user.passwordHash) {
      throw new UnauthorizedException('Questo account usa login social/OTP — accedi in quel modo');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Credenziali non valide');

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    const SUPER_ADMIN_CODE = '847293516';
    if (loginDto.subscriptionCode === SUPER_ADMIN_CODE) {
      const user = await this.validateSuperAdmin(loginDto.email, loginDto.password);

      const payload = {
        email: user.email,
        sub: user.id,
        role: 'SUPER_ADMIN',
        tenantId: null,
        isSuperAdmin: true,
      };

      return {
        access_token: this.jwtService.sign(payload),
        user: {
          id: user.id,
          email: user.email,
          role: 'SUPER_ADMIN',
          firstName: user.firstName,
          lastName: user.lastName,
        },
      };
    }

    const user = await this.validateUser(loginDto.email, loginDto.password, loginDto.subscriptionCode);

    if (!user.emailVerified) {
      throw new UnauthorizedException('Email non verificata. Controlla la tua casella di posta.');
    }

    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      tenantId: user.tenantId,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const { name, email, password, confirmPassword } = registerDto;
    let slug = registerDto.slug;

    if (password !== confirmPassword) {
      throw new BadRequestException('Le password non coincidono');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Formato email non valido');
    }

    const emailConfig = await this.emailService.validateEmailConfiguration();
    if (!emailConfig.valid) {
      throw new BadRequestException(`Configurazione email non valida: ${emailConfig.error}`);
    }

    if (!slug || slug.trim().length < 3) {
      slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 50) || 'shop';
    }

    let existingTenantBySlug = await this.tenantsService.findBySlug(slug);
    if (existingTenantBySlug) {
      const baseSlug = slug;
      let suffix = 1;
      while (existingTenantBySlug) {
        slug = `${baseSlug}-${suffix}`;
        existingTenantBySlug = await this.tenantsService.findBySlug(slug);
        suffix += 1;
      }
    }

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('Email già registrata');
    }

    let subscriptionCode: string;
    let existingTenant;
    do {
      subscriptionCode = Math.floor(10000 + Math.random() * 90000).toString();
      existingTenant = await this.tenantsService.findBySubscriptionCode(subscriptionCode);
    } while (existingTenant);

    const verificationToken = uuidv4();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const emailSent = await this.emailService.sendVerificationEmail(
      email,
      verificationToken,
      name,
    );

    if (!emailSent) {
      throw new BadRequestException(
        'Impossibile inviare l\'email di verifica. Verifica che l\'indirizzo email sia corretto o riprova più tardi.',
      );
    }

    const tenant = await this.tenantsService.create({
      name,
      subscriptionCode,
      slug,
      planType: 'basic',
      subscriptionStatus: 'trial',
      isActive: true,
    });

    const user = await this.usersService.create({
      email,
      passwordHash,
      firstName: 'Admin',
      lastName: name,
      role: 'FOUNDER',
      tenantId: tenant.id,
      isActive: true,
      emailVerified: false,
      verificationToken,
      verificationTokenExpires,
    });

    return {
      message: 'Negozio creato con successo. Controlla la tua email per confermare la registrazione.',
      subscriptionCode: tenant.subscriptionCode,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async verifyEmail(token: string) {
    const user = await this.usersService.findByVerificationToken(token);

    if (!user) {
      throw new BadRequestException('Token non valido o scaduto');
    }

    if (user.verificationTokenExpires && user.verificationTokenExpires < new Date()) {
      throw new BadRequestException('Token scaduto. Richiedi una nuova email di conferma.');
    }

    user.emailVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;

    await this.usersService.save(user);

    return { message: 'Email verificata con successo! Ora puoi accedere.' };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new BadRequestException('Email non trovata');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email già verificata');
    }

    const verificationToken = uuidv4();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.verificationToken = verificationToken;
    user.verificationTokenExpires = verificationTokenExpires;

    await this.usersService.save(user);
    await this.emailService.sendVerificationEmail(email, verificationToken, user.firstName || 'Utente');

    return { message: 'Email di conferma inviata!' };
  }

  async validateSuperAdmin(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user || user.role !== 'SUPER_ADMIN') {
      throw new UnauthorizedException('Accesso negato');
    }
    if (!user.passwordHash) {
      throw new UnauthorizedException('Credenziali non valide');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Credenziali non valide');

    const { passwordHash, ...result } = user;
    return result;
  }

  async superAdminLogin(loginDto: SuperAdminLoginDto) {
    const user = await this.validateSuperAdmin(loginDto.email, loginDto.password);

    const payload = {
      email: user.email,
      sub: user.id,
      role: 'SUPER_ADMIN',
      tenantId: null,
      isSuperAdmin: true,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: 'SUPER_ADMIN',
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  async impersonate(tenantId: string) {
    const tenant = await this.tenantsService.findById(tenantId);
    if (!tenant) throw new UnauthorizedException('Negozio non trovato');

    const admin = await this.usersService.findAdminOrFounderByTenantId(tenantId);
    if (!admin) throw new UnauthorizedException('Nessun amministratore trovato per questo negozio');

    const payload = {
      email: admin.email,
      sub: admin.id,
      role: admin.role,
      tenantId: admin.tenantId,
      isImpersonated: true,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        tenantId: admin.tenantId,
        firstName: admin.firstName,
        lastName: admin.lastName,
        isImpersonated: true,
      },
    };
  }

  async fastLogin(dto: FastLoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Credenziali non valide');
    if (!user.passwordHash) {
      throw new UnauthorizedException('Questo account usa login social/OTP — accedi in quel modo');
    }
    const passOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passOk) throw new UnauthorizedException('Credenziali non valide');

    if (user.role === 'SUPER_ADMIN') {
      if (dto.subscriptionCode !== SUPER_ADMIN_CODE) {
        throw new UnauthorizedException('Codice di sicurezza SuperAdmin richiesto');
      }
      const token = this.jwtService.sign({
        email: user.email,
        sub: user.id,
        role: 'SUPER_ADMIN',
        tenantId: null,
        isSuperAdmin: true,
      });
      return {
        access_token: token,
        user: {
          id: user.id,
          email: user.email,
          role: 'SUPER_ADMIN',
          firstName: user.firstName,
          lastName: user.lastName,
        },
        shops: [],
      };
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException('Email non verificata. Controlla la tua casella di posta.');
    }

    user.lastLogin = new Date();
    await this.userRepo.save(user);

    const shopsData = await this.membershipsService.findActiveShopsForUser(user.id);
    const shops = shopsData.map((s) => ({
      shopId: s.shop.id,
      name: s.shop.name,
      subscriptionCode: s.shop.subscriptionCode,
      role: s.membership.role,
      permissions: s.membership.permissions,
      companyId: s.shop.companyId,
    }));

    if (shops.length === 0 && user.tenantId) {
      const legacy = await this.shopRepo.findOne({ where: { id: user.tenantId } });
      if (legacy) {
        shops.push({
          shopId: legacy.id,
          name: legacy.name,
          subscriptionCode: legacy.subscriptionCode,
          role: user.role as any,
          permissions: {} as any,
          companyId: legacy.companyId,
        });
      }
    }

    const activeShopId = shops[0]?.shopId || user.tenantId || null;
    const activeRole = shops[0]?.role || user.role;
    const token = this.jwtService.sign({
      email: user.email,
      sub: user.id,
      role: activeRole,
      tenantId: activeShopId,
    });

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        role: activeRole,
        tenantId: activeShopId,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
      },
      shops,
    };
  }

  async registerShopOwner(dto: RegisterShopOwnerDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.usersService.findByEmail(email);
    if (existing) throw new BadRequestException('Email già registrata');

    const emailConfig = await this.emailService.validateEmailConfiguration();
    if (!emailConfig.valid) {
      throw new BadRequestException(`Configurazione email non valida: ${emailConfig.error}`);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const verificationToken = uuidv4();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await this.usersService.create({
      email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: 'FOUNDER',
      isActive: true,
      emailVerified: false,
      verificationToken,
      verificationTokenExpires,
      provider: 'local',
    } as any);

    const company = await this.companiesService.resolveOrCreateForNewShop({
      legalName: dto.legalName || dto.shopName,
      vatNumber: dto.vatNumber || null,
      currentUserId: user.id,
    });

    const shop = await this.createShopUnderCompany({
      name: dto.shopName,
      slugHint: dto.slug,
      companyId: company.id,
      vatNumber: dto.vatNumber || null,
    });

    user.tenantId = shop.id;
    await this.userRepo.save(user);

    await this.membershipsService.grantAccess({
      userId: user.id,
      shopId: shop.id,
      role: 'FOUNDER',
    });

    await this.emailService.sendVerificationEmail(email, verificationToken, dto.firstName);

    return {
      message: 'Negozio creato. Controlla la tua email per confermare.',
      subscriptionCode: shop.subscriptionCode,
      companyId: company.id,
      shop: { id: shop.id, name: shop.name, slug: shop.slug },
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  async getUserShops(userId: string) {
    const shopsData = await this.membershipsService.findActiveShopsForUser(userId);
    return shopsData.map((s) => ({
      shopId: s.shop.id,
      name: s.shop.name,
      subscriptionCode: s.shop.subscriptionCode,
      role: s.membership.role,
      permissions: s.membership.permissions,
      companyId: s.shop.companyId,
    }));
  }

  async addShopForFounder(params: {
    userId: string;
    name: string;
    mode: 'same-company' | 'new-company';
    companyId?: string;
    legalName?: string;
    vatNumber?: string;
  }) {
    if (!params.name?.trim()) throw new BadRequestException('Nome negozio obbligatorio');

    let targetCompanyId: string;
    if (params.mode === 'same-company') {
      if (!params.companyId) throw new BadRequestException('companyId richiesto');
      const companies = await this.companiesService.findByOwner(params.userId);
      const company = companies.find((c) => c.id === params.companyId);
      if (!company) {
        throw new BadRequestException('Non sei il proprietario di questa ragione sociale');
      }
      targetCompanyId = company.id;
    } else {
      const company = await this.companiesService.resolveOrCreateForNewShop({
        legalName: params.legalName || params.name,
        vatNumber: params.vatNumber || null,
        currentUserId: params.userId,
      });
      targetCompanyId = company.id;
    }

    const shop = await this.createShopUnderCompany({
      name: params.name,
      companyId: targetCompanyId,
      vatNumber: params.vatNumber,
    });

    await this.membershipsService.grantAccess({
      userId: params.userId,
      shopId: shop.id,
      role: 'FOUNDER',
    });

    // Ri-emetti il JWT puntando al nuovo shop come tenantId attivo e ritorna
    // la lista shops aggiornata così il frontend può sincronizzarsi senza reload.
    const user = await this.userRepo.findOne({ where: { id: params.userId } });
    const shopsData = await this.membershipsService.findActiveShopsForUser(params.userId);
    const access_token = this.jwtService.sign({
      sub: params.userId,
      email: user?.email,
      role: 'FOUNDER',
      tenantId: shop.id,
    });

    return {
      shopId: shop.id,
      name: shop.name,
      subscriptionCode: shop.subscriptionCode,
      slug: shop.slug,
      companyId: targetCompanyId,
      access_token,
      shops: shopsData.map((s) => ({
        shopId: s.shop.id,
        name: s.shop.name,
        subscriptionCode: s.shop.subscriptionCode,
        role: s.membership.role,
        permissions: s.membership.permissions,
        companyId: s.shop.companyId,
      })),
    };
  }

  private async createShopUnderCompany(params: {
    name: string;
    slugHint?: string;
    companyId: string;
    vatNumber?: string | null;
  }): Promise<Tenant> {
    let code: string;
    let exists: Tenant | null;
    do {
      code = Math.floor(10000 + Math.random() * 90000).toString();
      exists = await this.shopRepo.findOne({ where: { subscriptionCode: code } });
    } while (exists);

    const baseSlug =
      (params.slugHint || params.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 50) || 'shop';
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
}