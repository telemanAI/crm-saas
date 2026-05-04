import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { Practice } from '../practices/entities/practice.entity';
import { CustomFieldsService } from '../custom-fields/custom-fields.service';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customerRepo: Repository<Customer>,
    @InjectRepository(Practice)
    private practiceRepo: Repository<Practice>,
    private customFieldsService: CustomFieldsService,
  ) {}

  async create(tenantId: string, data: any, userId?: string): Promise<Customer> {
    const customerData: any = {
      tenantId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phonePrimary: data.phonePrimary || data.phone,
      phoneSecondary: data.phoneSecondary,
      fiscalCode: data.fiscalCode?.toUpperCase(),
      vatNumber: data.vatNumber,
      address: data.address,
      customerSegment: data.customerSegment,
      assignedTo: data.assignedTo,
      status: data.status || 'active',
      notes: data.notes,
    };

    const customer = this.customerRepo.create(customerData);
    const saved = await this.customerRepo.save(customer);
    const customerSaved = Array.isArray(saved) ? saved[0] : saved;

    if (data.customFields && customerSaved.id && userId) {
      for (const [fieldId, value] of Object.entries(data.customFields)) {
        await this.customFieldsService.setFieldValue(
          tenantId,
          'customer',
          customerSaved.id,
          fieldId,
          value,
          userId,
        );
      }
    }

    return customerSaved;
  }

  /**
   * PHASE A — BUG #3: filtra per `assignedTo` (o `createdBy` come fallback)
   * quando l'utente NON ha il permesso `canViewAllCustomers`.
   *
   * @param tenantId  Shop attivo
   * @param userId    User loggato (per filtrare a scope operatore)
   * @param canViewAll Se true → niente filtro per scope operatore (founder/admin con permesso)
   */
  async findAll(
    tenantId: string,
    userId?: string,
    canViewAll: boolean = true,
  ): Promise<Customer[]> {
    if (canViewAll || !userId) {
      return this.customerRepo.find({
        where: { tenantId },
        order: { createdAt: 'DESC' },
      });
    }

    // Operatore senza permesso: vede solo clienti assegnati a lui
    return this.customerRepo
      .createQueryBuilder('c')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.assignedTo = :userId', { userId })
      .orderBy('c.createdAt', 'DESC')
      .getMany();
  }

  async findOne(tenantId: string, id: string): Promise<any> {
    const customer = await this.customerRepo.findOne({
      where: { id, tenantId },
    });

    if (!customer) {
      throw new NotFoundException('Cliente non trovato');
    }

    const customFields = await this.customFieldsService.getFieldValues(
      tenantId,
      'customer',
      id,
    );

    return {
      ...customer,
      customFields,
    };
  }

  async findByFiscalCode(tenantId: string, fiscalCode: string): Promise<Customer | null> {
    if (!fiscalCode) return null;
    
    return this.customerRepo.findOne({
      where: { 
        tenantId, 
        fiscalCode: fiscalCode.toUpperCase().trim() 
      },
    });
  }

  async searchByFiscalCodePartial(tenantId: string, partialCode: string): Promise<Customer[]> {
    if (!partialCode || partialCode.length < 3) return [];
    
    return this.customerRepo.find({
      where: { 
        tenantId, 
        fiscalCode: Like(`${partialCode.toUpperCase()}%`) 
      },
      take: 5,
      order: { createdAt: 'DESC' },
    });
  }

  async searchByPhonePartial(tenantId: string, partialPhone: string): Promise<Customer[]> {
    if (!partialPhone || partialPhone.length < 3) return [];
    
    return this.customerRepo.find({
      where: [
        { tenantId, phonePrimary: Like(`%${partialPhone}%`) },
        { tenantId, phoneSecondary: Like(`%${partialPhone}%`) }
      ],
      take: 5,
      order: { createdAt: 'DESC' },
    });
  }

  async searchByNamePartial(tenantId: string, partialName: string): Promise<Customer[]> {
    if (!partialName || partialName.length < 2) return [];
    
    return this.customerRepo.find({
      where: [
        { tenantId, firstName: Like(`%${partialName}%`) },
        { tenantId, lastName: Like(`%${partialName}%`) }
      ],
      take: 5,
      order: { createdAt: 'DESC' },
    });
  }

  async update(tenantId: string, id: string, data: any, userId: string): Promise<Customer> {
    const customer = await this.customerRepo.findOne({
      where: { id, tenantId },
    });

    if (!customer) {
      throw new NotFoundException('Cliente non trovato');
    }

    const customFields = data.customFields;
    delete data.customFields;

    Object.assign(customer, data);
    const saved = await this.customerRepo.save(customer);
    const updated = Array.isArray(saved) ? saved[0] : saved;

    if (customFields && updated.id) {
      for (const [fieldId, value] of Object.entries(customFields)) {
        await this.customFieldsService.setFieldValue(
          tenantId,
          'customer',
          id,
          fieldId,
          value,
          userId,
        );
      }
    }

    return updated;
  }

  // ELIMINAZIONE A CASCATA: prima le pratiche, poi il cliente
  async remove(tenantId: string, id: string): Promise<void> {
    const customer = await this.customerRepo.findOne({
      where: { id, tenantId },
    });

    if (!customer) {
      throw new NotFoundException('Cliente non trovato');
    }

    // TROVA E ELIMINA TUTTE LE PRATICHE ASSOCIATE
    const practices = await this.practiceRepo.find({
      where: { customerId: id, tenantId },
    });

    if (practices.length > 0) {
      await this.practiceRepo.remove(practices);
      console.log(`Eliminate ${practices.length} pratiche associate al cliente ${id}`);
    }

    // ORA ELIMINA IL CLIENTE
    await this.customerRepo.remove(customer);
  }

  async addNote(tenantId: string, customerId: string, text: string, userId: string, userName: string): Promise<Customer> {
    const customer = await this.findOne(tenantId, customerId);
    
    const newNote = {
      text: text.trim(),
      createdAt: new Date(),
      createdBy: userName,
      createdById: userId
    };
    
    if (!customer.notesHistory) {
      customer.notesHistory = [];
    }
    
    customer.notesHistory.push(newNote);
    
    // Aggiorna anche il campo notes legacy per retrocompatibilità
    customer.notes = customer.notesHistory.map(n => n.text).join('\n---\n');
    
    return this.customerRepo.save(customer);
  }

  async count(): Promise<number> {
    return await this.customerRepo.count();
  }

  async deleteNote(tenantId: string, customerId: string, noteIndex: number, userId: string): Promise<Customer> {
    const customer = await this.customerRepo.findOne({
      where: { id: customerId, tenantId },
    });
    
    if (!customer) {
      throw new NotFoundException('Cliente non trovato');
    }
    
    if (!customer.notesHistory || noteIndex < 0 || noteIndex >= customer.notesHistory.length) {
      throw new NotFoundException('Nota non trovata');
    }
    
    // Verifica autore
    if (customer.notesHistory[noteIndex].createdById !== userId) {
      throw new Error('Non autorizzato a eliminare questa nota');
    }
    
    customer.notesHistory.splice(noteIndex, 1);
    
    // Aggiorna campo notes legacy
    customer.notes = customer.notesHistory.map(n => n.text).join('\n---\n');
    
    return this.customerRepo.save(customer);
  }
}