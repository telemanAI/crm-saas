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
 */
@Controller('auth')
export class AuthFlowsController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
    private readonly socialAuthService: SocialAuthService,
    private readonly invitesService: InvitesService,
  ) {}

  @Public()
  @Post('login-v2')
  @HttpCode(HttpStatus.OK)
  async loginV2(@Body() dto: FastLoginDto) {
    return this.authService.fastLogin(dto);
  }

  @Public()
  @Post('register-shop-owner')
  @HttpCode(HttpStatus.CREATED)
  async registerShopOwner(@Body() dto: RegisterShopOwnerDto) {
    return this.authService.registerShopOwner(dto);
  }

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

  @Public()
  @Post('complete-registration')
  @HttpCode(HttpStatus.OK)
  async completeRegistration(@Body() dto: CompleteRegistrationDto) {
    return this.socialAuthService.completeRegistration(dto);
  }

  /**
   * Switch shop attivo: ritorna token + user + shops aggiornati.
   */
  @Post('switch-shop')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async switchShop(@Req() req: any, @Body() body: { shopId: string }) {
    if (!body?.shopId) throw new BadRequestException('shopId richiesto');
    const result = await this.socialAuthService.switchActiveShop(
      req.user.id,
      body.shopId,
    );
    return {
      token: result.token,
      access_token: result.token,
      user: result.user,
      shops: result.shops,
    };
  }

  @Get('my-shops')
  @UseGuards(JwtAuthGuard)
  async myShops(@Req() req: any) {
    return this.authService.getUserShops(req.user.id);
  }

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
  async googleAuth(): Promise<void> {}

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    return this.handleSocialCallback('google', req, res);
  }

  // =====================================================
  // Facebook OAuth
  // =====================================================
  @Public()
  @Get('facebook')
  @UseGuards(FacebookAuthGuard)
  async facebookAuth(): Promise<void> {}

  @Public()
  @Get('facebook/callback')
  @UseGuards(FacebookAuthGuard)
  async facebookCallback(@Req() req: Request, @Res() res: Response) {
    return this.handleSocialCallback('facebook', req, res);
  }

  /**
   * Flusso callback OAuth comune a Google e Facebook.
   *
   * FIX: aggiunge inviteToken anche nei query params del redirect come backup,
   * nel caso lo state OAuth venga perso o alterato da browser in-app su mobile.
   */
  private async handleSocialCallback(
    providerLabel: 'google' | 'facebook',
    req: Request,
    res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) {
      throw new BadRequestException('FRONTEND_URL non configurato');
    }
    const profile: any = (req as any).user;
    const state = String((req.query as any)?.state || '');
    const inviteToken = state.startsWith('invite:') ? state.slice(7) : null;

    const result = await this.socialAuthService.handleSocialOrOtpLogin(profile);

    if (result.status === 'logged_in') {
      let finalToken = result.token;
      let finalUser = result.user as any;
      let finalShops = result.shops;
      if (inviteToken) {
        try {
          const session = await this.invitesService.acceptInviteAndBuildSession(
            inviteToken,
            finalUser.id,
          );
          finalToken = session.access_token;
          finalUser = session.user;
          finalShops = session.shops;
        } catch (e) {
          console.error(`[${providerLabel}/callback] accept invite failed:`, e);
        }
      }
      const shopsEncoded = encodeURIComponent(JSON.stringify(finalShops));
      const userEncoded = encodeURIComponent(JSON.stringify(finalUser));
      // FIX: include inviteToken anche in query params come backup per mobile
      const inviteParam = inviteToken ? `&invite=${encodeURIComponent(inviteToken)}` : '';
      return res.redirect(
        `${frontendUrl}/auth/callback?token=${finalToken}&user=${userEncoded}&shops=${shopsEncoded}${inviteParam}`,
      );
    }

    // Utente NUOVO: redirect a complete-registration con pending + eventuale invite
    const inviteParam = inviteToken ? `&invite=${encodeURIComponent(inviteToken)}` : '';
    return res.redirect(
      `${frontendUrl}/auth/complete-registration?pending=${result.pendingToken}` +
        `&email=${encodeURIComponent(result.email)}` +
        `&firstName=${encodeURIComponent(result.firstName || '')}` +
        `&lastName=${encodeURIComponent(result.lastName || '')}` +
        inviteParam,
    );
  }

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