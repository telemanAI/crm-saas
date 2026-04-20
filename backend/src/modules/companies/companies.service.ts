import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { Tenant } from '../tenants/entities/tenant.entity';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company) private readonly repo: Repository<Company>,
    @InjectRepository(Tenant) private readonly shopRepo: Repository<Tenant>,
  ) {}

  /**
   * Risolve la Company per un'azione di \"crea nuovo shop\":
   * - legalName mai visto → crea Company (P.IVA obbligatoria solo se legalName vuoto? come da requisito: se NO ragione sociale allora SÌ P.IVA)
   * - legalName esistente + ownerId combacia → ritorna la Company (stessa azienda, nuovo shop)
   * - legalName esistente + ownerId diverso + P.IVA diversa → crea NUOVA company (omonima ma legalmente diversa)
   * - legalName esistente + ownerId diverso + P.IVA uguale → ERRORE (duplicato, l'owner originale deve invitare)
   * - legalName esistente + ownerId diverso + P.IVA assente → ERRORE (richiede P.IVA per distinguere)
   */
  async resolveOrCreateForNewShop(params: {
    legalName: string | undefined | null;
    vatNumber: string | undefined | null;
    currentUserId: string;
  }): Promise<Company> {
    const legalName = (params.legalName || '').trim();
    const vat = (params.vatNumber || '').trim() || null;

    if (!legalName && !vat) {
      throw new BadRequestException('Inserisci ragione sociale o P.IVA');
    }

    // Se legalName assente ma vat presente: cerca per P.IVA
    if (!legalName && vat) {
      const existing = await this.repo.findOne({ where: { vatNumber: vat } });
      if (existing) {
        if (existing.ownerId !== params.currentUserId) {
          throw new ForbiddenException('Esiste già una Company con questa P.IVA — chiedi al proprietario di invitarti');
        }
        return existing;
      }
      return this.repo.save(
        this.repo.create({
          legalName: `Company ${vat}`,
          vatNumber: vat,
          ownerId: params.currentUserId,
          isActive: true,
        }),
      );
    }

    // legalName presente
    const sameName = await this.repo.find({ where: { legalName } });
    if (sameName.length === 0) {
      // mai vista → se ne crea una nuova (vat opzionale)
      return this.repo.save(
        this.repo.create({
          legalName,
          vatNumber: vat,
          ownerId: params.currentUserId,
          isActive: true,
        }),
      );
    }

    // esiste almeno una Company con questo legalName
    const ownedByCurrent = sameName.find(c => c.ownerId === params.currentUserId);
    if (ownedByCurrent) {
      // L'utente è già founder di questa ragione sociale → riusa
      return ownedByCurrent;
    }

    // Ragione sociale esistente ma di altro proprietario → serve P.IVA per distinguere
    if (!vat) {
      throw new BadRequestException(
        'Esiste già una ragione sociale con questo nome. Inserisci la P.IVA per distinguere le aziende.',
      );
    }
    const sameVat = sameName.find(c => c.vatNumber === vat);
    if (sameVat) {
      throw new ForbiddenException(
        'Questa Company (stessa ragione sociale + P.IVA) appartiene già ad un altro proprietario. Chiedigli di invitarti come operatore.',
      );
    }
    // legalName coincide ma P.IVA diversa → aziende diverse, ok creare
    return this.repo.save(
      this.repo.create({
        legalName,
        vatNumber: vat,
        ownerId: params.currentUserId,
        isActive: true,
      }),
    );
  }

  async findById(id: string): Promise<Company> {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Company non trovata');
    return c;
  }

  async findByOwner(ownerId: string): Promise<Company[]> {
    return this.repo.find({ where: { ownerId, isActive: true } });
  }

  async listShopsOfCompany(companyId: string): Promise<Tenant[]> {
    return this.shopRepo.find({ where: { companyId } });
  }

  async listAll(search?: string): Promise<Company[]> {
    if (!search) return this.repo.find({ order: { createdAt: 'DESC' } });
    return this.repo
      .createQueryBuilder('c')
      .where('c.legal_name ILIKE :s OR c.vat_number ILIKE :s', { s: `%${search}%` })
      .orderBy('c.created_at', 'DESC')
      .getMany();
  }
}
