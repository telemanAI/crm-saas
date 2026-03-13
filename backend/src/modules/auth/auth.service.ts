import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { TenantsService } from '../tenants/tenants.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SuperAdminLoginDto } from './dto/super-admin-login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private tenantsService: TenantsService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string, subscriptionCode: string): Promise<any> {
    const tenant = await this.tenantsService.findBySubscriptionCode(subscriptionCode);
    if (!tenant) throw new UnauthorizedException('Codice negozio non valido');

    const user = await this.usersService.findByEmail(email, tenant.id);
    if (!user) throw new UnauthorizedException('Credenziali non valide');

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Credenziali non valide');

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password, loginDto.subscriptionCode);

    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      tenantId: user.tenantId
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
    const { name, email, password, confirmPassword, slug } = registerDto;

    if (password !== confirmPassword) {
      throw new BadRequestException('Le password non coincidono');
    }

    const existingTenantBySlug = await this.tenantsService.findBySlug(slug);
    if (existingTenantBySlug) {
      throw new BadRequestException('Slug già in uso');
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

    const tenant = await this.tenantsService.create({
      name,
      subscriptionCode,
      slug,
      planType: 'basic',
      subscriptionStatus: 'trial',
      isActive: true,
    });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await this.usersService.create({
      email,
      passwordHash,
      firstName: 'Admin',
      lastName: name,
      role: 'ADMIN',
      tenantId: tenant.id,
      isActive: true,
    });

    return {
      message: 'Negozio creato con successo',
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

  async validateSuperAdmin(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user || user.role !== 'SUPER_ADMIN') {
      throw new UnauthorizedException('Accesso negato');
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
      isSuperAdmin: true
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

    const admin = await this.usersService.findAdminByTenantId(tenantId);
    if (!admin) throw new UnauthorizedException('Admin non trovato');

    const payload = {
      email: admin.email,
      sub: admin.id,
      role: admin.role,
      tenantId: admin.tenantId,
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
      },
    };
  }
}
