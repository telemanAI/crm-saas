
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  // GET /api/offers - Lista offerte attive (per operatori)
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.offersService.findAll();
  }

  // GET /api/offers/grouped - Lista offerte raggruppate per provider
  @Get('grouped')
  @UseGuards(JwtAuthGuard)
  findAllGrouped() {
    return this.offersService.findAllGrouped();
  }

  // GET /api/offers/provider/:provider - Offerte per provider specifico
  @Get('provider/:provider')
  @UseGuards(JwtAuthGuard)
  findByProvider(@Param('provider') provider: string) {
    return this.offersService.findByProvider(provider);
  }

  // GET /api/offers/:id - Dettaglio singola offerta
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.offersService.findOne(id);
  }
}

// Controller separato per admin
@Controller('admin/offers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminOffersController {
  constructor(private readonly offersService: OffersService) {}

  // GET /api/admin/offers - Lista tutte le offerte (anche disattivate)
  @Get()
  findAllAdmin() {
    return this.offersService.findAllAdmin();
  }

  // POST /api/admin/offers - Crea nuova offerta
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createOfferDto: CreateOfferDto) {
    return this.offersService.create(createOfferDto);
  }

  // PATCH /api/admin/offers/:id - Aggiorna offerta
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateOfferDto: UpdateOfferDto,
  ) {
    return this.offersService.update(id, updateOfferDto);
  }

  // PATCH /api/admin/offers/:id/toggle - Attiva/Disattiva offerta
  @Patch(':id/toggle')
  toggleActive(@Param('id', ParseUUIDPipe) id: string) {
    return this.offersService.toggleActive(id);
  }

  // DELETE /api/admin/offers/:id - Elimina offerta
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.offersService.remove(id);
  }
}