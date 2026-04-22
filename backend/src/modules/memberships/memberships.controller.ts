import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MembershipsService } from './memberships.service';
import { MembershipPermissions, MembershipRole } from './entities/user-shop-membership.entity';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Controller('memberships')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  /** Elenco membri dello shop attivo (richiede ADMIN/FOUNDER). */
  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  async list(@Req() req: any) {
    const shopId = req.user.tenantId;
    if (!shopId) throw new BadRequestException('Nessuno shop attivo');
    const members = await this.membershipsService.listShopMembers(shopId, true);
    return members.map(m => ({
      userId: m.userId,
      email: m.user?.email,
      firstName: m.user?.firstName,
      lastName: m.user?.lastName,
      avatarUrl: m.user?.avatarUrl,
      role: m.role,
      permissions: m.permissions,
      isActive: m.isActive,
      joinedAt: m.joinedAt,
      leftAt: m.leftAt,
      endOfRelationshipNote: m.endOfRelationshipNote,
    }));
  }

  @Patch(':userId/permissions')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('canChangeUserRoles')
  async updatePermissions(
    @Req() req: any,
    @Param('userId') userId: string,
    @Body() permissions: MembershipPermissions,
  ) {
    return this.membershipsService.updatePermissions(userId, req.user.tenantId, permissions);
  }

  @Patch(':userId/role')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('canChangeUserRoles')
  async updateRole(
    @Req() req: any,
    @Param('userId') userId: string,
    @Body() body: { role: MembershipRole },
  ) {
    return this.membershipsService.updateRole(userId, req.user.tenantId, body.role);
  }

  @Delete(':userId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('canChangeUserRoles')
  @HttpCode(HttpStatus.OK)
  async revoke(
    @Req() req: any,
    @Param('userId') userId: string,
    @Body() body: { endOfRelationshipNote?: string },
  ) {
    const m = await this.membershipsService.revokeAccess(
      userId,
      req.user.tenantId,
      body?.endOfRelationshipNote,
    );
    return { message: 'Accesso revocato', membership: m };
  }

  @Get('history/:userId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  async history(@Req() req: any, @Param('userId') userId: string) {
    return this.membershipsService.getHistoryInShop(userId, req.user.tenantId);
  }
}
