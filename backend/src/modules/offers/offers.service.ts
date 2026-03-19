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