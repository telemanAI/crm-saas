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

  /** Elenco membri dello shop attivo (richiede canManageTeam). */
  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('canManageTeam')
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
    // FIX BUG: la signature del service è (shopId, userId, permissions)
    return this.membershipsService.updatePermissions(req.user.tenantId, userId, permissions);
  }

  @Patch(':userId/role')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('canChangeUserRoles')
  async updateRole(
    @Req() req: any,
    @Param('userId') userId: string,
    @Body() body: { role: MembershipRole },
  ) {
    // FIX BUG: la signature del service è (shopId, userId, role)
    return this.membershipsService.updateRole(req.user.tenantId, userId, body.role);
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
    // FIX BUG: la signature del service è (shopId, userId, note)
    const m = await this.membershipsService.revokeAccess(
      req.user.tenantId,
      userId,
      body?.endOfRelationshipNote,
    );
    return { message: 'Accesso revocato', membership: m };
  }

  @Get('history/:userId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('canManageTeam')
  async history(@Req() req: any, @Param('userId') userId: string) {
    return this.membershipsService.getHistoryInShop(userId, req.user.tenantId);
  }
}
