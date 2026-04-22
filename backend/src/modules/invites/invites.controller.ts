import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { InvitesService } from './invites.service';
import { CreateInviteDto, AcceptInviteViaPasswordDto } from './dto/invite.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Controller('invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  /**
   * Admin/Founder crea invito per il proprio shop attivo (tenantId dal JWT).
   */
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('canChangeUserRoles')
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() dto: CreateInviteDto) {
    const shopId = req.user.tenantId;
    if (!shopId) throw new BadRequestException('Nessuno shop attivo nel token');

    // ← VALIDAZIONE: l'utente deve essere identificato nel token
    if (!req.user.id) {
      throw new BadRequestException('Utente non identificato nel token JWT');
    }

    const invite = await this.invitesService.createInvite(shopId, req.user.id, dto);
    return {
      id: invite.id,
      token: invite.token,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      expiresAt: invite.expiresAt,
    };
  }

  @Post(':id/resend')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('canChangeUserRoles')
  @HttpCode(HttpStatus.OK)
  async resend(@Param('id') id: string) {
    const invite = await this.invitesService.resendInvite(id);
    return { message: 'Invito reinviato', token: invite.token };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('canChangeUserRoles')
  @HttpCode(HttpStatus.OK)
  async revoke(@Param('id') id: string) {
    await this.invitesService.revoke(id);
    return { message: 'Invito revocato' };
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  async list(@Req() req: any) {
    const shopId = req.user.tenantId;
    if (!shopId) throw new BadRequestException('Nessuno shop attivo nel token');
    return this.invitesService.listByShop(shopId);
  }

  /**
   * Accettazione invito via password (utente NUOVO).
   */
  @Post('accept/:token/password')
  @HttpCode(HttpStatus.OK)
  async acceptWithPassword(
    @Param('token') token: string,
    @Body() dto: AcceptInviteViaPasswordDto,
  ) {
    const user = await this.invitesService.acceptInviteCreatingUser(token, dto);
    return { message: 'Invito accettato. Accedi con le tue credenziali.', userId: user.id };
  }

  /**
   * Accettazione invito per utente GIÀ LOGGATO (per social/OTP).
   * Ritorna anche un access_token fresco con tenantId = negozio invitato
   * così il frontend può saltare il passaggio da /select-shop.
   */
  @Post('accept/:token')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @HttpCode(HttpStatus.OK)
  async acceptAuthenticated(@Param('token') token: string, @Req() req: any) {
    // ← VALIDAZIONE: l'utente deve essere identificato nel token
    if (!req.user?.id) {
      throw new BadRequestException('Utente non identificato nel token JWT');
    }

    const result = await this.invitesService.acceptInviteAndBuildSession(
      token,
      req.user.id,
    );
    return {
      message: 'Ora fai parte del negozio',
      shopId: result.membership.shopId,
      role: result.membership.role,
      access_token: result.access_token,
      user: result.user,
      shops: result.shops,
    };
  }
}