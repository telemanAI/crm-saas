import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Param,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { OtpService } from './services/otp.service';
import { SocialAuthService } from './services/social-auth.service';
import { InvitesService } from '../invites/invites.service';
import { GoogleAuthGuard, FacebookAuthGuard } from './guards/oauth.guards';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { FastLoginDto } from './dto/fast-login.dto';
import {
  RequestOtpDto,
  VerifyOtpDto,
  CompleteRegistrationDto,
  RegisterShopOwnerDto,
} from './dto/auth-flow.dto';

/**
 * Nuovo auth controller (flussi v2, additivo).
 * Non sostituisce auth.controller.ts esistente: aggiunge endpoint paralleli.
 */
@Controller('auth')
export class AuthFlowsController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
    private readonly socialAuthService: SocialAuthService,
    private readonly invitesService: InvitesService,
  ) {}

  // =====================================================
  // Fast login (senza subscriptionCode per utenti normali)
  // =====================================================
  @Public()
  @Post('login-v2')
  @HttpCode(HttpStatus.OK)
  async loginV2(@Body() dto: FastLoginDto) {
    return this.authService.fastLogin(dto);
  }

  // =====================================================
  // Registrazione negoziante con password
  // =====================================================
  @Public()
  @Post('register-shop-owner')
  @HttpCode(HttpStatus.CREATED)
  async registerShopOwner(@Body() dto: RegisterShopOwnerDto) {
    return this.authService.registerShopOwner(dto);
  }

  // =====================================================
  // OTP
  // =====================================================
  @Public()
  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  async requestOtp(@Body() dto: RequestOtpDto) {
    return this.otpService.requestOtp(dto.email);
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    await this.otpService.verifyOtp(dto.email, dto.code);
    return this.socialAuthService.handleSocialOrOtpLogin({
      provider: 'otp',
      providerId: dto.email,
      email: dto.email,
    });
  }

  // =====================================================
  // Completa registrazione (dopo social login / OTP per NUOVO utente)
  // =====================================================
  @Public()
  @Post('complete-registration')
  @HttpCode(HttpStatus.OK)
  async completeRegistration(@Body() dto: CompleteRegistrationDto) {
    return this.socialAuthService.completeRegistration(dto);
  }

  // =====================================================
  // Switch shop (per utenti multi-negozio)
  // =====================================================
  @Post('switch-shop')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async switchShop(@Req() req: any, @Body() body: { shopId: string }) {
    if (!body?.shopId) throw new BadRequestException('shopId richiesto');
    return this.socialAuthService.switchActiveShop(req.user.id, body.shopId);
  }

  @Get('my-shops')
  @UseGuards(JwtAuthGuard)
  async myShops(@Req() req: any) {
    return this.authService.getUserShops(req.user.id);
  }

  /**
   * Aggiungi un nuovo negozio (solo FOUNDER autenticato).
   * Il negozio viene creato sotto la Company esistente (se mode=same-company) o nuova.
   */
  @Post('add-shop')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async addShop(
    @Req() req: any,
    @Body() body: {
      name: string;
      mode: 'same-company' | 'new-company';
      companyId?: string;
      legalName?: string;
      vatNumber?: string;
    },
  ) {
    if (!req.user?.id) throw new UnauthorizedException('Utente non identificato');
    return this.authService.addShopForFounder({
      userId: req.user.id,
      name: body.name,
      mode: body.mode || 'same-company',
      companyId: body.companyId,
      legalName: body.legalName,
      vatNumber: body.vatNumber,
    });
  }

  // =====================================================
  // Google OAuth
  // =====================================================
  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth(): Promise<void> {
    // passport redirect, nothing to return
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) {
      throw new BadRequestException('FRONTEND_URL non configurato');
    }
    const profile: any = (req as any).user;
    // Estrai eventuale invite token dallo state OAuth (format "invite:TOKEN")
    const state = String((req.query as any)?.state || '');
    const inviteToken = state.startsWith('invite:') ? state.slice(7) : null;

    const result = await this.socialAuthService.handleSocialOrOtpLogin(profile);
    if (result.status === 'logged_in') {
      // Utente gia esistente: se c'e un invito, applicalo subito
      if (inviteToken) {
        try {
          const userObj = result.user as any;
          await this.invitesService.acceptInviteWithUserId(inviteToken, userObj.id);
        } catch (e) {
          console.error('[google/callback] accept invite failed:', e);
        }
      }
      const shopsEncoded = encodeURIComponent(JSON.stringify(result.shops));
      const userEncoded = encodeURIComponent(JSON.stringify(result.user));
      return res.redirect(
        `${frontendUrl}/auth/callback?token=${result.token}&user=${userEncoded}&shops=${shopsEncoded}`,
      );
    }
    // Utente nuovo: passa anche l'invite al complete-registration se presente
    const inviteParam = inviteToken ? `&invite=${encodeURIComponent(inviteToken)}` : '';
    return res.redirect(
      `${frontendUrl}/auth/callback?token=${result.pendingToken}&email=${encodeURIComponent(result.email)}&firstName=${encodeURIComponent(result.firstName || '')}&lastName=${encodeURIComponent(result.lastName || '')}${inviteParam}`,
    );
  }

  // =====================================================
  // Facebook OAuth (attivo solo se credenziali presenti in env)
  // =====================================================
  @Public()
  @Get('facebook')
  @UseGuards(FacebookAuthGuard)
  async facebookAuth(): Promise<void> {}

  @Public()
  @Get('facebook/callback')
  @UseGuards(FacebookAuthGuard)
  async facebookCallback(@Req() req: Request, @Res() res: Response) {
    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) throw new BadRequestException('FRONTEND_URL non configurato');
    const profile: any = (req as any).user;
    const state = String((req.query as any)?.state || '');
    const inviteToken = state.startsWith('invite:') ? state.slice(7) : null;

    const result = await this.socialAuthService.handleSocialOrOtpLogin(profile);
    if (result.status === 'logged_in') {
      if (inviteToken) {
        try {
          const userObj = result.user as any;
          await this.invitesService.acceptInviteWithUserId(inviteToken, userObj.id);
        } catch (e) {
          console.error('[facebook/callback] accept invite failed:', e);
        }
      }
      const shopsEncoded = encodeURIComponent(JSON.stringify(result.shops));
      const userEncoded = encodeURIComponent(JSON.stringify(result.user));
      return res.redirect(
        `${frontendUrl}/auth/callback?token=${result.token}&user=${userEncoded}&shops=${shopsEncoded}`,
      );
    }
    const inviteParam = inviteToken ? `&invite=${encodeURIComponent(inviteToken)}` : '';
    return res.redirect(
      `${frontendUrl}/auth/complete-registration?pending=${result.pendingToken}&email=${encodeURIComponent(result.email)}&firstName=${encodeURIComponent(result.firstName || '')}&lastName=${encodeURIComponent(result.lastName || '')}${inviteParam}`,
    );
  }

  // =====================================================
  // Invite public endpoints (non serve auth per leggerlo)
  // =====================================================
  @Public()
  @Get('invite/:token')
  async getInvite(@Param('token') token: string) {
    const invite = await this.invitesService.getByToken(token);
    return {
      email: invite.email,
      role: invite.role,
      shopName: invite.shop?.name,
      shopCode: invite.shop?.subscriptionCode,
      adminNote: invite.adminNote,
      expiresAt: invite.expiresAt,
    };
  }
}
