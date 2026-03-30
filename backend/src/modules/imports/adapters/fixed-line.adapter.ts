import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { Practice, PracticeType } from '../../practices/entities/practice.entity';
import { CommonValidators, ValidationResult } from '../validators/common.validators';

export interface RowValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  data: any;
}

@Injectable()
export class FixedLineAdapter {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Practice)
    private practiceRepository: Repository<Practice>,
  ) {}

  async validateRow(row: any, mapping: any, tenantId: string): Promise<RowValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const data: any = {};

    // Estrai campi mappati
    mapping.columns.forEach(col => {
      const sourceValue = row[col.source];
      let transformedValue = sourceValue;

      // Applica transformer se presente
      if (col.transformer && sourceValue) {
        switch (col.transformer) {
          case 'uppercase':
            transformedValue = sourceValue.toString().toUpperCase();
            break;
          case 'extract_price':
            transformedValue = CommonValidators.extractPrice(sourceValue);
            break;
          case 'normalize_status':
            transformedValue = CommonValidators.normalizeStatus(sourceValue, 'PRACTICE');
            break;
          case 'normalize_operational_status':
            transformedValue = CommonValidators.normalizeStatus(sourceValue, 'OPERATIONAL');
            break;
          case 'normalize_phone':
            transformedValue = CommonValidators.normalizePhone(sourceValue);
            break;
        }
      }

      data[col.target] = transformedValue;
    });

    // Validazione campi obbligatori
    const cfValidation = CommonValidators.fiscalCode(data.fiscalCode);
    if (!cfValidation.valid) {
      errors.push(`CF: ${cfValidation.error}`);
    }

    const phoneValidation = CommonValidators.phone(data.phonePrimary);
    if (!phoneValidation.valid) {
      errors.push(`Telefono: ${phoneValidation.error}`);
    }

    if (!data.firstName) errors.push('Nome obbligatorio');
    if (!data.lastName) errors.push('Cognome obbligatorio');

    // Validazioni specifiche per pratiche
    if (!data.type) {
      errors.push('Tipo pratica obbligatorio');
    } else if (!['TIM_FIBRA', 'VODAFONE', 'WINDTRE', 'ILIAD', 'OPTIMA', 'IREN', 'SKY'].includes(data.type)) {
      errors.push(`Tipo pratica non valido: ${data.type}`);
    }

    // Warning se mancano campi opzionali ma utili
    if (!data.email) warnings.push('Email mancante');
    if (!data.offerName) warnings.push('Nome offerta mancante');

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      data,
    };
  }

  async processRow(
    row: any,
    mapping: any,
    tenantId: string,
    userId: string,
  ): Promise<{ customer: Customer; practice: Practice }> {
    const validationResult = await this.validateRow(row, mapping, tenantId);
    
    if (!validationResult.valid) {
      throw new Error(`Validazione fallita: ${validationResult.errors.join(', ')}`);
    }

    const data = validationResult.data;

    // 1. Trova o crea cliente
    let customer = await this.findOrCreateCustomer(data, tenantId, mapping.duplicateStrategy);

    // 2. Crea pratica
    const practice = await this.createPractice(data, customer.id, tenantId, userId);

    return { customer, practice };
  }

  private async findOrCreateCustomer(
    data: any,
    tenantId: string,
    strategy: 'SKIP' | 'UPDATE' | 'CREATE_NEW',
  ): Promise<Customer> {
    // Cerca cliente esistente per CF
    let existing = await this.customerRepository.findOne({
      where: { fiscalCode: data.fiscalCode, tenantId },
    });

    if (existing) {
      if (strategy === 'UPDATE') {
        // Aggiorna dati cliente se più completi
        existing.firstName = data.firstName || existing.firstName;
        existing.lastName = data.lastName || existing.lastName;
        existing.phonePrimary = data.phonePrimary || existing.phonePrimary;
        existing.email = data.email || existing.email;
        existing = await this.customerRepository.save(existing);
      }
      return existing;
    }

    // Crea nuovo cliente
    const newCustomer = this.customerRepository.create({
      tenantId,
      firstName: data.firstName,
      lastName: data.lastName,
      fiscalCode: data.fiscalCode,
      phonePrimary: data.phonePrimary,
      phoneSecondary: data.phoneSecondary,
      email: data.email,
      address: data.address || {},
      status: 'active',
    });

    return await this.customerRepository.save(newCustomer);
  }

  private async createPractice(
    data: any,
    customerId: string,
    tenantId: string,
    userId: string,
  ): Promise<Practice> {
    const practice = this.practiceRepository.create({
      tenantId,
      customerId,
      createdBy: userId,
      type: data.type as PracticeType,
      status: data.status || 'draft',
      operationalStatus: data.operationalStatus || 'PENDING',
      offerCode: data.offerCode,
      offerName: data.offerName,
      offerCanone: data.offerCanone,
      offerAttivazione: data.offerAttivazione,
      offerVincolo: data.offerVincolo,
      offerNote: data.offerNote,
      lineType: data.lineType,
      technology: data.technology,
      notes: data.notes,
      installationAddress: data.installationAddress || {},
      currentStep: 1,
      completedSteps: [],
    });

    return await this.practiceRepository.save(practice);
  }

  getTargetFields(): Array<{ name: string; label: string; type: string; required: boolean }> {
    return [
      // Campi cliente
      { name: 'firstName', label: 'Nome', type: 'string', required: true },
      { name: 'lastName', label: 'Cognome', type: 'string', required: true },
      { name: 'fiscalCode', label: 'Codice Fiscale', type: 'string', required: true },
      { name: 'phonePrimary', label: 'Telefono Principale', type: 'string', required: true },
      { name: 'phoneSecondary', label: 'Telefono Secondario', type: 'string', required: false },
      { name: 'email', label: 'Email', type: 'string', required: false },
      
      // Campi pratica
      { name: 'type', label: 'Tipo Pratica (SKY, TIM_FIBRA, etc)', type: 'enum', required: true },
      { name: 'offerName', label: 'Nome Offerta', type: 'string', required: false },
      { name: 'offerCanone', label: 'Canone', type: 'string', required: false },
      { name: 'offerAttivazione', label: 'Costo Attivazione', type: 'string', required: false },
      { name: 'offerVincolo', label: 'Vincolo', type: 'string', required: false },
      { name: 'technology', label: 'Tecnologia (FTTH, FTTC)', type: 'string', required: false },
      { name: 'lineType', label: 'Tipo Linea (Nuova/Migrazione)', type: 'string', required: false },
      { name: 'status', label: 'Stato', type: 'enum', required: false },
      { name: 'operationalStatus', label: 'Stato Operativo', type: 'enum', required: false },
      { name: 'notes', label: 'Note', type: 'text', required: false },
    ];
  }
}