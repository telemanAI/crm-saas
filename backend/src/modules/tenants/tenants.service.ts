import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantsService } from '../tenants/tenants.service';
import { UsersService } from '../users/users.service';

@Controller('api/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class SuperAdminController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly usersService: UsersService,
  ) {}

  // Tenants Management
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
    return this.tenantsService.update(id, data);
  }

  @Delete('tenants/:id')
  async deleteTenant(@Param('id') id: string, @Query('mode') mode: string) {
    if (mode === 'hard') {
      return this.tenantsService.hardDelete(id);
    }
    return this.tenantsService.softDelete(id);
  }

  @Put('tenants/:id/reactivate')
  async reactivateTenant(@Param('id') id: string) {
    return this.tenantsService.reactivate(id);
  }

  // Users Management
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
}