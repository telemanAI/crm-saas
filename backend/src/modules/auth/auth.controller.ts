import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SuperAdminLoginDto } from './dto/super-admin-login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { MembershipsService } from '../memberships/memberships.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly membershipsService: MembershipsService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // 5 tentativi / min
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 3, ttl: 60_000 } }) // 3 registrazioni / min
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // 5 tentativi / min
  async superAdminLogin(@Body() loginDto: SuperAdminLoginDto) {
    return this.authService.superAdminLogin(loginDto);
  }

  @Post('impersonate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async impersonate(@Body() body: { tenantId: string }) {
    return this.authService.impersonate(body.tenantId);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body('email') email: string) {
    return this.authService.resendVerificationEmail(email);
  }

  /**
   * Endpoint diagnostico (protetto): ritorna lo stato esatto dell'utente
   * chiamante dal punto di vista del backend. Utile per capire in produzione
   * perché un permesso viene negato senza dover leggere i log.
   *
   * Autorizzato a: SUPER_ADMIN e FOUNDER del tenant corrente.
   */
  @Get('debug')
  @UseGuards(JwtAuthGuard)
  async debug(@Req() req: any) {
    const user = req.user;
    if (!user) throw new ForbiddenException('Non autenticato');

    const isSuperAdmin = user.role === 'SUPER_ADMIN' || user.isSuperAdmin;

    let activeMembership: any = null;
    if (user.tenantId) {
      activeMembership = await this.membershipsService.findActiveForUserAndShop(
        user.id || user.userId || user.sub,
        user.tenantId,
      );
    }

    // Controllo accesso: SUPER_ADMIN sempre, FOUNDER solo per il proprio tenant.
    if (!isSuperAdmin && activeMembership?.role !== 'FOUNDER') {
      throw new ForbiddenException(
        'Endpoint diagnostico riservato a SUPER_ADMIN e FOUNDER',
      );
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        isSuperAdmin,
        isImpersonated: user.isImpersonated || false,
      },
      activeMembership: activeMembership
        ? {
            userId: activeMembership.userId,
            shopId: activeMembership.shopId,
            role: activeMembership.role,
            isActive: activeMembership.isActive,
            permissions: activeMembership.permissions,
            joinedAt: activeMembership.joinedAt,
            leftAt: activeMembership.leftAt,
          }
        : null,
      serverTime: new Date().toISOString(),
    };
  }
}
