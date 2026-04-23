import { Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantsService } from '../tenants/tenants.service';
import { UsersService } from '../users/users.service';
import { MembershipsService } from '../memberships/memberships.service';
import {
  MembershipRole,
  MembershipPermissions,
} from '../memberships/entities/user-shop-membership.entity';

@Controller('api/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class SuperAdminController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly usersService: UsersService,
    private readonly membershipsService: MembershipsService,
  ) {}

  // ============ Tenants ============
  @Get('tenants')
  async getAllTenants() {
    return this.tenantsService.findAll();
  }

  @Get('tenants/:id')
  async getTenant(@Param('id') id: string) {
    return this.tenantsService.findById(id);
  }

  @Put('tenants/:id')
  async updateTenant(@Param('id') id: string, @Body() data: any) {
    return this.tenantsService.updateTenant(id, data);
  }

  @Delete('tenants/:id')
  async deleteTenant(@Param('id') id: string, @Query('mode') mode: string) {
    if (mode === 'hard') {
      return this.tenantsService.hardDeleteTenant(id);
    }
    return this.tenantsService.softDeleteTenant(id);
  }

  @Put('tenants/:id/reactivate')
  async reactivateTenant(@Param('id') id: string) {
    return this.tenantsService.reactivateTenant(id);
  }

  // ============ Users LEGACY ============
  // Vista basata su User.tenantId: BUGGATA (vede solo il FOUNDER + utenti
  // con User.tenantId coincidente). Mantenuta per retrocompat, ma nel
  // frontend la pagina dettaglio shop DEVE usare /tenants/:id/memberships.
  @Get('tenants/:tenantId/users')
  async getTenantUsers(@Param('tenantId') tenantId: string) {
    return this.usersService.findAllByTenant(tenantId);
  }

  @Put('users/:userId/role')
  async updateUserRole(
    @Param('userId') userId: string,
    @Body('role') role: 'OPERATOR' | 'ADMIN' | 'FOUNDER',
  ) {
    return this.usersService.updateRole(userId, role);
  }

  @Post('users/:userId/reset-password')
  async resetPassword(@Param('userId') userId: string, @Body('tenantId') tenantId: string) {
    const tempPassword = await this.usersService.resetPasswordBySuperAdmin(userId, tenantId);
    return { success: true, temporaryPassword: tempPassword };
  }

  // ============ Memberships NUOVI ENDPOINT ============
  // Fix del bug "super admin vede solo il FOUNDER": qui usiamo la tabella
  // user_shop_memberships che è la vera fonte di verità per "chi sta in che shop".

  /**
   * Lista TUTTI i membri di un negozio (attivi + ex-operatori).
   * Ritorna permessi, ruolo, note di fine rapporto, dati utente.
   */
  @Get('tenants/:tenantId/memberships')
  async getTenantMemberships(@Param('tenantId') tenantId: string) {
    const memberships = await this.membershipsService.listShopMembers(tenantId, true);
    return memberships.map((m) => ({
      id: m.id,
      userId: m.userId,
      shopId: m.shopId,
      role: m.role,
      permissions: m.permissions,
      isActive: m.isActive,
      joinedAt: m.joinedAt,
      leftAt: m.leftAt,
      endOfRelationshipNote: m.endOfRelationshipNote,
      invitedBy: m.invitedBy,
      user: m.user
        ? {
            id: m.user.id,
            email: m.user.email,
            firstName: m.user.firstName,
            lastName: m.user.lastName,
            isActive: m.user.isActive,
            lastLogin: (m.user as any).lastLogin ?? null,
          }
        : null,
    }));
  }

  /**
   * Cambia ruolo di un membro (SUPER_ADMIN only).
   */
  @Patch('tenants/:tenantId/memberships/:userId/role')
  async updateMembershipRole(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Body('role') role: MembershipRole,
  ) {
    return this.membershipsService.updateRole(tenantId, userId, role);
  }

  /**
   * Cambia permessi granulari di un membro. FOUNDER: sempre tutti true (vedi service).
   */
  @Patch('tenants/:tenantId/memberships/:userId/permissions')
  async updateMembershipPermissions(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Body() permissions: Partial<MembershipPermissions>,
  ) {
    return this.membershipsService.updatePermissions(tenantId, userId, permissions);
  }

  @Delete('tenants/:tenantId/memberships/:userId')
  async revokeMembership(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Body('endOfRelationshipNote') note?: string,
  ) {
    await this.membershipsService.revokeAccess(tenantId, userId, note);
    return { success: true };
  }

  @Post('tenants/:tenantId/memberships/:userId/reactivate')
  async reactivateMembership(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
  ) {
    return this.membershipsService.reactivateAccess(tenantId, userId);
  }
}
