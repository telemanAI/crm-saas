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
  Query,
} from '@nestjs/common';
import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { OfferCategory } from './entities/offer.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Query('category') category?: string) {
    return this.offersService.findAll(category as OfferCategory);
  }

  @Get('grouped')
  @UseGuards(JwtAuthGuard)
  findAllGrouped(@Query('category') category?: string) {
    return this.offersService.findAllGrouped(category as OfferCategory);
  }

  @Get('provider/:provider')
  @UseGuards(JwtAuthGuard)
  findByProvider(
    @Param('provider') provider: string,
    @Query('category') category?: string,
  ) {
    return this.offersService.findByProvider(provider, category as OfferCategory);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.offersService.findOne(id);
  }
}

@Controller('admin/offers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminOffersController {
  constructor(private readonly offersService: OffersService) {}

  @Get()
  findAllAdmin(@Query('category') category?: string) {
    return this.offersService.findAllAdmin(category as OfferCategory);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createOfferDto: CreateOfferDto) {
    return this.offersService.create(createOfferDto);
  }

  /**
   * Bulk update sort_order per riordinare le offerte.
   * IMPORTANTE: deve essere dichiarato PRIMA di `@Patch(':id')` per evitare
   * che il ParseUUIDPipe intercetti la stringa "reorder" come id.
   */
  @Patch('reorder')
  @HttpCode(HttpStatus.OK)
  async reorder(@Body() body: { items: { id: string; sort_order: number }[] }) {
    await this.offersService.updateSortOrders(body.items);
    return { message: 'Ordine aggiornato' };
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateOfferDto: UpdateOfferDto,
  ) {
    return this.offersService.update(id, updateOfferDto);
  }

  @Patch(':id/toggle')
  toggleActive(@Param('id', ParseUUIDPipe) id: string) {
    return this.offersService.toggleActive(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.offersService.remove(id);
  }
}