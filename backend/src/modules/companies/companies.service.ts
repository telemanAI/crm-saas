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

    // FIX M3: P.IVA obbligatoria per evitare ragioni sociali "gemelle" silenti
    // (es. due "Mario Rossi" senza P.IVA che creano company duplicate
    // perché PostgreSQL considera NULL ≠ NULL nell'unique index).
    if (!legalName) {
      throw new BadRequestException('Ragione sociale obbligatoria');
    }
    if (!vat) {
      throw new BadRequestException(
        'Partita IVA obbligatoria. Necessaria per identificare univocamente la ragione sociale ed evitare duplicati.',
      );
    }
    // Validazione formato P.IVA italiana (11 cifre numeriche)
    if (!/^\d{11}$/.test(vat)) {
      throw new BadRequestException(
        'Partita IVA non valida: deve essere composta da 11 cifre numeriche.',
      );
    }

    // 1) Cerca prima per P.IVA: se esiste, è la fonte di verità
    const byVat = await this.repo.findOne({ where: { vatNumber: vat } });
    if (byVat) {
      if (byVat.ownerId !== params.currentUserId) {
        throw new ForbiddenException(
          'Esiste già una Company con questa P.IVA — chiedi al proprietario di invitarti come operatore.',
        );
      }
      // Se l'utente è già owner ma con legalName diverso, riusiamo la company esistente.
      return byVat;
    }

    // 2) Nessuna company con questa P.IVA: ne creiamo una nuova.
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
