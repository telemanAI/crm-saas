import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantsService } from './tenants.service';
import { UsersService } from '../users/users.service';
import { ImportsService } from '../imports/imports.service';

/**
 * Controller per gestione Super Admin dei Tenant (Negozi)
 * Accesso: SOLO SUPER_ADMIN
 */
@Controller('super-admin/tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class SuperAdminTenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly usersService: UsersService,
    private readonly importsService: ImportsService,
  ) {}

  /**
   * GET /api/super-admin/tenants
   * Lista tutti i negozi con info base
   */
  @Get()
  async getAllTenants(@Query('search') search?: string) {
    const tenants = await this.tenantsService.findAllForSuperAdmin(search);
    return {
      success: true,
      tenants,
    };
  }

  /**
   * GET /api/super-admin/tenants/:id
   * Dettaglio completo negozio con founder, utenti, stats
   */
  @Get(':id')
  async getTenantDetail(@Param('id') tenantId: string) {
    const tenant = await this.tenantsService.findOneWithDetails(tenantId);
    const users = await this.usersService.findAllByTenant(tenantId);
    const stats = await this.tenantsService.getTenantStats(tenantId);

    return {
      success: true,
      tenant: {
        ...tenant,
        users: users.map((u) => ({
          id: u.id,
          name: ((u.firstName || '') + ' ' + (u.lastName || '')).trim() || u.email,
          email: u.email,
          role: u.role,
          isActive: u.isActive,
          createdAt: u.createdAt,
          lastLogin: u.lastLogin,
        })),
        stats,
      },
    };
  }

  /**
   * GET /api/super-admin/tenants/:id/imports/jobs
   * Lista import jobs di un negozio specifico
   */
  @Get(':id/imports/jobs')
  async getTenantImportJobs(@Param('id') tenantId: string) {
    const jobs = await this.importsService.getJobs(tenantId);
    return {
      success: true,
      jobs,
    };
  }

  /**
   * PUT /api/super-admin/tenants/:id
   * Aggiorna info negozio
   */
  @Put(':id')
  async updateTenant(
    @Param('id') tenantId: string,
    @Body() updateData: any,
  ) {
    const tenant = await this.tenantsService.updateTenant(tenantId, updateData);
    return {
      success: true,
      tenant,
      message: 'Negozio aggiornato con successo',
    };
  }

  /**
   * DELETE /api/super-admin/tenants/:id
   * Elimina negozio (soft delete o hard delete con cascade)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteTenant(
    @Param('id') tenantId: string,
    @Query('mode') mode: 'soft' | 'hard' = 'soft',
  ) {
    await this.tenantsService.deleteTenant(tenantId, mode);
    return {
      success: true,
      message: `Negozio ${mode === 'soft' ? 'disabilitato' : 'eliminato definitivamente'}`,
    };
  }

  /**
   * POST /api/super-admin/tenants/:id/users/:userId/reset-password
   * Reset password utente (genera nuova password temporanea)
   */
  @Post(':id/users/:userId/reset-password')
  async resetUserPassword(
    @Param('id') tenantId: string,
    @Param('userId') userId: string,
  ) {
    const newPassword = await this.usersService.resetPasswordBySuperAdmin(
      userId,
      tenantId,
    );
    return {
      success: true,
      temporaryPassword: newPassword,
      message: 'Password resettata. Comunica la password temporanea all\'utente.',
    };
  }

  /**
   * PUT /api/super-admin/tenants/:id/users/:userId/toggle-active
   * Attiva/Disattiva utente
   */
  @Put(':id/users/:userId/toggle-active')
  async toggleUserActive(
    @Param('id') tenantId: string,
    @Param('userId') userId: string,
  ) {
    const user = await this.usersService.toggleActive(userId, tenantId);
    return {
      success: true,
      user: {
        id: user.id,
        name: ((user.firstName || '') + ' ' + (user.lastName || '')).trim() || user.email,
        email: user.email,
        isActive: user.isActive,
      },
      message: `Utente ${user.isActive ? 'attivato' : 'disattivato'}`,
    };
  }

  /**
   * DELETE /api/super-admin/tenants/:id/users/:userId
   * Elimina utente da negozio
   */
  @Delete(':id/users/:userId')
  @HttpCode(HttpStatus.OK)
  async deleteUser(
    @Param('id') tenantId: string,
    @Param('userId') userId: string,
  ) {
    await this.usersService.deleteUserBySuperAdmin(userId, tenantId);
    return {
      success: true,
      message: 'Utente eliminato con successo',
    };
  }

  /**
   * PUT /api/super-admin/tenants/:id/users/:userId
   * Modifica dati utente (email, nome, ruolo)
   */
  @Put(':id/users/:userId')
  async updateUser(
    @Param('id') tenantId: string,
    @Param('userId') userId: string,
    @Body() updateData: { name?: string; email?: string; role?: string },
  ) {
    const user = await this.usersService.updateUserBySuperAdmin(
      userId,
      tenantId,
      updateData,
    );
    return {
      success: true,
      user: {
        id: user.id,
        name: ((user.firstName || '') + ' ' + (user.lastName || '')).trim() || user.email,
        email: user.email,
        role: user.role,
      },
      message: 'Utente aggiornato con successo',
    };
  }

  /**
   * GET /api/super-admin/tenants/:id/founder
   * Info fondatore del negozio
   */
  @Get(':id/founder')
  async getTenantFounder(@Param('id') tenantId: string) {
    const founder = await this.tenantsService.getFounder(tenantId);
    return {
      success: true,
      founder: {
        id: founder.id,
        name: ((founder.firstName || '') + ' ' + (founder.lastName || '')).trim() || founder.email,
        email: founder.email,
        role: founder.role,
        createdAt: founder.createdAt,
      },
    };
  }
}


