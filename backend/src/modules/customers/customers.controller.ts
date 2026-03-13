import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards, Query } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles('ADMIN', 'OPERATOR', 'SUPER_ADMIN')
  async create(@Body() data: any, @Request() req) {
    return this.customersService.create(req.user.tenantId, data, req.user.userId);
  }

  @Get()
  @Roles('ADMIN', 'OPERATOR', 'BACKOFFICE')
  async findAll(@Request() req) {
    return this.customersService.findAll(req.user.tenantId);
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
  @Roles('ADMIN', 'OPERATOR', 'SUPER_ADMIN')
  async update(@Param('id') id: string, @Body() data: any, @Request() req) {
    return this.customersService.update(req.user.tenantId, id, data, req.user.sub);
  }

  @Delete(':id')
  @Roles('ADMIN')
  async remove(@Param('id') id: string, @Request() req) {
    return this.customersService.remove(req.user.tenantId, id);
  }
    @Post(':id/notes')
  @Roles('ADMIN', 'OPERATOR', 'BACKOFFICE')
  async addNote(
    @Param('id') id: string,
    @Body('text') text: string,
    @Request() req,
  ) {
    const userName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Operatore';
    return this.customersService.addNote(req.user.tenantId, id, text, req.user.userId, userName);
  }

  @Delete(':id/notes/:noteIndex')
  @Roles('ADMIN', 'OPERATOR', 'BACKOFFICE')
  async deleteNote(
    @Param('id') id: string,
    @Param('noteIndex') noteIndex: string,
    @Request() req,
  ) {
    return this.customersService.deleteNote(req.user.tenantId, id, parseInt(noteIndex), req.user.userId);
  }
}