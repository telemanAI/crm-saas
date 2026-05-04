// backend/src/modules/customers/customers.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  Query,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { MembershipsService } from '../memberships/memberships.service';

/**
 * ORDINE GUARD:
 *   1. JwtAuthGuard         -> popola req.user
 *   2. PermissionsGuard     -> controlla @RequirePermission (errore chiaro: "Permesso mancante: ...")
 *   3. RolesGuard           -> controlla @Roles (fallback coarse-grained)
 *
 * Prima l'ordine era Jwt -> Roles -> Permissions: RolesGuard bloccava PRIMA del permesso granulare
 * con un messaggio generico ("Ruolo non autorizzato"), rendendo il debug confuso.
 */
@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionsGuard, RolesGuard)
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly membershipsService: MembershipsService,
  ) {}

  /**
   * PHASE A — BUG #3: helper per determinare se l'utente può vedere tutti i clienti.
   * FOUNDER e SUPER_ADMIN sempre true. Altri: leggono il flag dalla membership.
   */
  private async canViewAllCustomers(req: any): Promise<boolean> {
    if (req.user.role === 'SUPER_ADMIN' || req.user.isSuperAdmin) return true;
    const m = await this.membershipsService.findActiveForUserAndShop(
      req.user.userId || req.user.id,
      req.user.tenantId,
    );
    if (!m) return false;
    if (m.role === 'FOUNDER') return true;
    return (m.permissions || ({} as any)).canViewAllCustomers === true;
  }

  @Post()
  @Roles('ADMIN', 'OPERATOR', 'SUPER_ADMIN')
  @AuditLog({ action: 'CREATE', entityType: 'customer' })
  async create(@Body() data: any, @Request() req) {
    return this.customersService.create(req.user.tenantId, data, req.user.userId);
  }

  @Get()
  @Roles('ADMIN', 'OPERATOR', 'BACKOFFICE')
  async findAll(@Request() req) {
    const canViewAll = await this.canViewAllCustomers(req);
    return this.customersService.findAll(req.user.tenantId, req.user.userId, canViewAll);
  }

  @Get('search/by-fiscal-code')
  @Roles('ADMIN', 'OPERATOR', 'BACKOFFICE')
  async searchByFiscalCode(@Query('code') code: string, @Request() req) {
    return this.customersService.searchByFiscalCodePartial(req.user.tenantId, code);
  }

  @Get('search/by-phone')
  @Roles('ADMIN', 'OPERATOR', 'BACKOFFICE')
  async searchByPhone(@Query('q') query: string, @Request() req) {
    return this.customersService.searchByPhonePartial(req.user.tenantId, query);
  }

  @Get('search/by-name')
  @Roles('ADMIN', 'OPERATOR', 'BACKOFFICE')
  async searchByName(@Query('q') query: string, @Request() req) {
    return this.customersService.searchByNamePartial(req.user.tenantId, query);
  }

  @Get(':id')
  @Roles('ADMIN', 'OPERATOR', 'BACKOFFICE')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.customersService.findOne(req.user.tenantId, id);
  }

  @Put(':id')
  @RequirePermission('canEditCustomers')
  @Roles('ADMIN', 'OPERATOR', 'SUPER_ADMIN')
  @AuditLog({ action: 'UPDATE', entityType: 'customer' })
  async update(@Param('id') id: string, @Body() data: any, @Request() req) {
    return this.customersService.update(req.user.tenantId, id, data, req.user.sub);
  }

  @Delete(':id')
  @RequirePermission('canDeleteCustomers')
  @Roles('ADMIN')
  @AuditLog({ action: 'DELETE', entityType: 'customer' })
  async remove(@Param('id') id: string, @Request() req) {
    return this.customersService.remove(req.user.tenantId, id);
  }

  @Post(':id/notes')
  @Roles('ADMIN', 'OPERATOR', 'BACKOFFICE')
  @AuditLog({ action: 'ADD_NOTE', entityType: 'customer' })
  async addNote(
    @Param('id') id: string,
    @Body('text') text: string,
    @Request() req,
  ) {
    const userName =
      `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Operatore';
    return this.customersService.addNote(
      req.user.tenantId,
      id,
      text,
      req.user.userId,
      userName,
    );
  }

  @Delete(':id/notes/:noteIndex')
  @Roles('ADMIN', 'OPERATOR', 'BACKOFFICE')
  @AuditLog({ action: 'DELETE_NOTE', entityType: 'customer' })
  async deleteNote(
    @Param('id') id: string,
    @Param('noteIndex') noteIndex: string,
    @Request() req,
  ) {
    return this.customersService.deleteNote(
      req.user.tenantId,
      id,
      parseInt(noteIndex),
      req.user.userId,
    );
  }
}
