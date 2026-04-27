import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Offer, OfferCategory } from './entities/offer.entity';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';

@Injectable()
export class OffersService {
  constructor(
    @InjectRepository(Offer)
    private offersRepository: Repository<Offer>,
  ) {}

  async create(createOfferDto: CreateOfferDto): Promise<Offer> {
    const offer = this.offersRepository.create({
      ...createOfferDto,
      category: createOfferDto.category || 'FIXED_LINE',
    });
    return this.offersRepository.save(offer);
  }

  async findAll(category?: OfferCategory): Promise<Offer[]> {
    const where: FindOptionsWhere<Offer> = { is_active: true };
    where.category = category || 'FIXED_LINE';
    return this.offersRepository.find({
      where,
      order: { provider: 'ASC', sort_order: 'ASC', name: 'ASC' },
    });
  }

  async findAllAdmin(category?: OfferCategory): Promise<Offer[]> {
    const where: FindOptionsWhere<Offer> = {};
    where.category = category || 'FIXED_LINE';
    return this.offersRepository.find({
      where,
      order: { provider: 'ASC', sort_order: 'ASC', name: 'ASC' },
    });
  }

  async findByProvider(provider: string, category?: OfferCategory): Promise<Offer[]> {
    const where: FindOptionsWhere<Offer> = { provider, is_active: true };
    if (category) where.category = category;
    return this.offersRepository.find({
      where,
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

  /**
   * Offerte raggruppate per provider, filtrabili per categoria.
   * FIX: normalizza TIM_FIBRA → TIM per compatibilità wizard rete fissa.
   * Gli altri provider non vengono toccati (se non hanno offerte nel DB,
   * il wizard usa il fallback hardcoded come prima).
   */
  async findAllGrouped(category?: OfferCategory): Promise<Record<string, Offer[]>> {
    const offers = await this.findAll(category);

    // Solo TIM ha nome diverso nel DB vs wizard. Gli altri provider
    // o non esistono nel DB (usa fallback) o hanno nome già compatibile.
    const providerDisplayMap: Record<string, string> = {
      'TIM_FIBRA': 'TIM',
    };

    return offers.reduce((acc, offer) => {
      const providerKey = providerDisplayMap[offer.provider] || offer.provider;
      if (!acc[providerKey]) {
        acc[providerKey] = [];
      }
      acc[providerKey].push(offer);
      return acc;
    }, {} as Record<string, Offer[]>);
  }
}