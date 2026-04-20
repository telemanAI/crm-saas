import { Controller, Get, UseGuards, Req, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CompaniesService } from './companies.service';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  async mine(@Req() req: any) {
    return this.companiesService.findByOwner(req.user.id);
  }

  @Get(':id/shops')
  @UseGuards(JwtAuthGuard)
  async shopsOf(@Param('id') id: string) {
    return this.companiesService.listShopsOfCompany(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(@Req() req: any) {
    // SuperAdmin → tutte; altrimenti solo proprie
    if (req.user.role === 'SUPER_ADMIN') {
      return this.companiesService.listAll();
    }
    return this.companiesService.findByOwner(req.user.id);
  }
}
