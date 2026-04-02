import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { TenantsService } from '../tenants/tenants.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SuperAdminLoginDto } from './dto/super-admin-login.dto';
import { EmailService } from '../email/email.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private tenantsService: TenantsService,
    private jwtService: JwtService,
    private emailService: EmailService,
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
    // Check if it's super admin code
    const SUPER_ADMIN_CODE = '847293516';
    
    if (loginDto.subscriptionCode === SUPER_ADMIN_CODE) {
      // Super Admin login
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

    // Normal tenant login
    const user = await this.validateUser(loginDto.email, loginDto.password, loginDto.subscriptionCode);
    
    // Controlla se l'email è verificata
    if (!user.emailVerified) {
      throw new UnauthorizedException('Email non verificata. Controlla la tua casella di posta.');
    }
    
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

    // Validazione password
    if (password !== confirmPassword) {
      throw new BadRequestException('Le password non coincidono');
    }

    // Validazione email formato
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Formato email non valido');
    }

    // Validazione configurazione email PRIMA di procedere
    const emailConfig = await this.emailService.validateEmailConfiguration();
    if (!emailConfig.valid) {
      throw new BadRequestException(`Configurazione email non valida: ${emailConfig.error}`);
    }

    // Check esistenze
    const existingTenantBySlug = await this.tenantsService.findBySlug(slug);
    if (existingTenantBySlug) {
      throw new BadRequestException('Slug già in uso');
    }

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('Email già registrata');
    }

    // Genera dati
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

    // TENTA INVIO EMAIL PRIMA di salvare nel DB
    // Questo è il pattern "fail fast" - se l'email non parte, non creiamo nulla
    const emailSent = await this.emailService.sendVerificationEmail(
      email, 
      verificationToken, 
      name
    );

    if (!emailSent) {
      throw new BadRequestException(
        'Impossibile inviare l\'email di verifica. Verifica che l\'indirizzo email sia corretto o riprova più tardi.'
      );
    }

    // Solo se l'email è partita, creiamo tenant e utente
    const tenant = await this.tenantsService.create({
      name,
      subscriptionCode,
      slug,
      planType: 'basic',
      subscriptionStatus: 'trial',
      isActive: true,
    });

    // Crea primo utente come FOUNDER (non ADMIN)
    const user = await this.usersService.create({
      email,
      passwordHash,
      firstName: 'Admin',
      lastName: name,
      role: 'FOUNDER', // ← FOUNDER invece di ADMIN
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