import { Controller, Get, Post, Put, Param, Body, UseGuards } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('tenants')
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  async findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.tenantsService.findById(id);
  }

  @Get(':id/config')
  async getConfig(@Param('id') id: string) {
    const tenant = await this.tenantsService.findById(id);
    return {
      enableWashStep: tenant.enableWashStep,
      enableAdditionalPackages: tenant.enableAdditionalPackages,
    };
  }

  @Put(':id/config')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  async updateConfig(
    @Param('id') id: string,
    @Body() config: { enableWashStep?: boolean; enableAdditionalPackages?: boolean }
  ) {
    return this.tenantsService.updateTenantConfig(id, config);
  }
}