Ho capito la struttura. Ora creo tutti i file:

📁 BACKEND - FILE COMPLETI
File 1: backend/src/modules/offers/entities/offer.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('offers')
export class Offer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  provider: string; // TIM, Vodafone, WindTre, Iliad, Optima, Iren, SKY

  @Column({ length: 255 })
  name: string;

  @Column({ length: 100 })
  canone: string;

  @Column({ length: 100, nullable: true })
  attivazione: string;

  @Column({ length: 100, nullable: true })
  vincolo: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ length: 100, nullable: true })
  disattivazione: string;

  @Column({ length: 20, default: 'consumer' })
  type: string; // consumer | business

  @Column({ length: 50, nullable: true })
  scadenza: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: 0 })
  sort_order: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
File 2: backend/src/modules/offers/dto/create-offer.dto.ts
import { IsString, IsOptional, IsBoolean, IsNumber, IsIn } from 'class-validator';

export class CreateOfferDto {
  @IsString()
  provider: string;

  @IsString()
  name: string;

  @IsString()
  canone: string;

  @IsString()
  @IsOptional()
  attivazione?: string;

  @IsString()
  @IsOptional()
  vincolo?: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  @IsOptional()
  disattivazione?: string;

  @IsString()
  @IsIn(['consumer', 'business'])
  type: string;

  @IsString()
  @IsOptional()
  scadenza?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsNumber()
  @IsOptional()
  sort_order?: number;
}
File 3: backend/src/modules/offers/dto/update-offer.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateOfferDto } from './create-offer.dto';

export class UpdateOfferDto extends PartialType(CreateOfferDto) {}
File 4: backend/src/modules/offers/offers.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Offer } from './entities/offer.entity';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';

@Injectable()
export class OffersService {
  constructor(
    @InjectRepository(Offer)
    private offersRepository: Repository<Offer>,
  ) {}

  async create(createOfferDto: CreateOfferDto): Promise<Offer> {
    const offer = this.offersRepository.create(createOfferDto);
    return this.offersRepository.save(offer);
  }

  async findAll(): Promise<Offer[]> {
    return this.offersRepository.find({
      where: { is_active: true },
      order: { provider: 'ASC', sort_order: 'ASC', name: 'ASC' },
    });
  }

  async findAllAdmin(): Promise<Offer[]> {
    return this.offersRepository.find({
      order: { provider: 'ASC', sort_order: 'ASC', name: 'ASC' },
    });
  }

  async findByProvider(provider: string): Promise<Offer[]> {
    return this.offersRepository.find({
      where: { provider, is_active: true },
      order: { sort_order: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Offer> {
    const offer = await this.offersRepository.findOne({ where: { id } });
    if (!offer) {
      throw new NotFoundException(`Offerta con ID ${id} non trovata`);
    }
    return offer;
  }

  async update(id: string, updateOfferDto: UpdateOfferDto): Promise<Offer> {
    const offer = await this.findOne(id);
    Object.assign(offer, updateOfferDto);
    return this.offersRepository.save(offer);
  }

  async remove(id: string): Promise<void> {
    const offer = await this.findOne(id);
    await this.offersRepository.remove(offer);
  }

  async toggleActive(id: string): Promise<Offer> {
    const offer = await this.findOne(id);
    offer.is_active = !offer.is_active;
    return this.offersRepository.save(offer);
  }

  // Raggruppa offerte per provider (per il frontend)
  async findAllGrouped(): Promise<Record<string, Offer[]>> {
    const offers = await this.findAll();
    return offers.reduce((acc, offer) => {
      if (!acc[offer.provider]) {
        acc[offer.provider] = [];
      }
      acc[offer.provider].push(offer);
      return acc;
    }, {} as Record<string, Offer[]>);
  }
}
File 5: backend/src/modules/offers/offers.controller.ts
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