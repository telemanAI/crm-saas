import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { Practice } from '../../practices/entities/practice.entity';

interface TargetField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  category: 'customer' | 'practice';
  helpText?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  data: any;
  hasPractice: boolean;
}

@Injectable()
export class UnifiedAdapter {
  private customerCache: Map<string, any> = new Map();

  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Practice)
    private practiceRepository: Repository<Practice>,
    private dataSource: DataSource,
  ) {}

  resetCache() {
    this.customerCache.clear();
  }

  getTargetFields(): TargetField[] {
    return [
      // Customer fields
      { name: 'firstName', label: 'Nome', type: 'string', required: true, category: 'customer' },
      { name: 'lastName', label: 'Cognome', type: 'string', required: true, category: 'customer' },
      { name: 'fiscalCode', label: 'Codice Fiscale', type: 'string', required: false, category: 'customer' },
      { name: 'vatNumber', label: 'Partita IVA', type: 'string', required: false, category: 'customer' },
      { name: 'email', label: 'Email', type: 'email', required: false, category: 'customer' },
      { name: 'phone', label: 'Telefono', type: 'string', required: false, category: 'customer' },
      { name: 'mobile', label: 'Cellulare', type: 'string', required: false, category: 'customer' },
      { name: 'address', label: 'Indirizzo', type: 'string', required: false, category: 'customer' },
      { name: 'city', label: 'Città', type: 'string', required: false, category: 'customer' },
      { name: 'postalCode', label: 'CAP', type: 'string', required: false, category: 'customer' },
      { name: 'province', label: 'Provincia', type: 'string', required: false, category: 'customer' },
      { name: 'dateOfBirth', label: 'Data di Nascita', type: 'date', required: false, category: 'customer' },
      { name: 'birthPlace', label: 'Luogo di Nascita', type: 'string', required: false, category: 'customer' },
      
      // Practice fields
      { name: 'type', label: 'Tipo Pratica', type: 'string', required: false, category: 'practice', helpText: 'TIM_FIBRA, VODAFONE, WINDTRE, SKY, ILIAD, IREN, OPTIMA' },
      { name: 'offerCode', label: 'Codice Offerta', type: 'string', required: false, category: 'practice' },
      { name: 'offerName', label: 'Nome Offerta', type: 'string', required: false, category: 'practice' },
      { name: 'offerCanone', label: 'Canone Offerta', type: 'number', required: false, category: 'practice' },
      { name: 'offerAttivazione', label: 'Costo Attivazione', type: 'number', required: false, category: 'practice' },
      { name: 'offerVincolo', label: 'Vincolo (mesi)', type: 'number', required: false, category: 'practice' },
      { name: 'offerNote', label: 'Note Offerta', type: 'string', required: false, category: 'practice' },
      { name: 'createdAt', label: 'Data Inserimento Pratica', type: 'date', required: false, category: 'practice', helpText: 'Data originale dal vecchio sistema' },
      
      // NUOVI CAMPI
      { name: 'soldBy', label: 'Venduto Da (nome)', type: 'string', required: false, category: 'practice', helpText: 'Operatore/agente che ha venduto' },
      { name: 'enteredBy', label: 'Inserito Da (nome)', type: 'string', required: false, category: 'practice', helpText: 'Operatore che inserisce la pratica' },
      { name: 'migrationCode', label: 'Codice Migrazione', type: 'string', required: false, category: 'practice', helpText: 'Codice dal vecchio sistema' },
      { name: 'iban', label: 'IBAN', type: 'string', required: false, category: 'practice', helpText: 'IBAN per addebito' },
      { name: 'oldLineNumber', label: 'Numero Vecchia Linea', type: 'string', required: false, category: 'practice', helpText: 'Numero da migrare' },
      { name: 'oldLineOperator', label: 'Operatore Vecchia Linea', type: 'string', required: false, category: 'practice', helpText: 'Tim, Vodafone, Wind, etc.' },
      
      { name: 'status', label: 'Stato Pratica', type: 'string', required: false, category: 'practice' },
      { name: 'operationalStatus', label: 'Stato Operativo', type: 'string', required: false, category: 'practice' },
      { name: 'lineType', label: 'Tipo Linea', type: 'string', required: false, category: 'practice' },
      { name: 'technology', label: 'Tecnologia', type: 'string', required: false, category: 'practice' },
      { name: 'notes', label: 'Note', type: 'string', required: false, category: 'practice' },
      { name: 'installationAddress', label: 'Indirizzo Installazione', type: 'string', required: false, category: 'practice' },
    ];
  }

  isPracticeField(fieldName: string): boolean {
    const fields = ['type', 'offerCode', 'offerName', 'offerCanone', 'offerAttivazione', 
                   'offerVincolo', 'offerNote', 'createdAt', 'soldBy', 'enteredBy', 
                   'migrationCode', 'iban', 'oldLineNumber', 'oldLineOperator',
                   'status', 'operationalStatus', 'lineType', 'technology', 
                   'notes', 'installationAddress'];
    return fields.includes(fieldName);
  }

  async validateRow(row: any, mappingConfig: any, tenantId: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const customerData: any = {};
    const practiceData: any = {};
    
    // Estrai dati dal mapping
    if (mappingConfig.columns) {
      for (const col of mappingConfig.columns) {
        const value = this.applyTransformer(row[col.source], col.transformer);
        if (this.isPracticeField(col.target)) {
          practiceData[col.target] = value;
        } else {
          customerData[col.target] = value;
        }
      }
    }

    // Validazione cliente
    if (!customerData.firstName) errors.push('Nome obbligatorio');
    if (!customerData.lastName) errors.push('Cognome obbligatorio');
    
    // Se ci sono dati pratica, valida il tipo
    const hasPracticeData = Object.keys(practiceData).length > 0;
    if (hasPracticeData) {
      // Auto-detect tipo da nome offerta se non mappato
      let practiceType = practiceData.type;
      if (!practiceType && practiceData.offerName) {
        const offerNameLower = practiceData.offerName.toLowerCase();
        if (offerNameLower.includes('sky')) practiceType = 'SKY';
        else if (offerNameLower.includes('vodafone')) practiceType = 'VODAFONE';
        else if (offerNameLower.includes('wind') || offerNameLower.includes('tre')) practiceType = 'WINDTRE';
        else if (offerNameLower.includes('iliad')) practiceType = 'ILIAD';
        else if (offerNameLower.includes('iren')) practiceType = 'IREN';
        else if (offerNameLower.includes('optima')) practiceType = 'OPTIMA';
        else if (offerNameLower.includes('tim')) practiceType = 'TIM_FIBRA';
      }

      // Se c'è forceType nella config, sovrascrive tutto
      if (mappingConfig.forceType) {
        practiceType = mappingConfig.forceType;
      }

      if (!practiceType && hasPracticeData) {
        errors.push('Tipo pratica obbligatorio se si inseriscono dati pratica');
      } else if (practiceType) {
        practiceData.type = practiceType;
      }
    }

    // Cerca cliente esistente
    let existingCustomer = null;
    const searchKey = customerData.fiscalCode || customerData.email || customerData.phone;
    
    if (searchKey) {
      // Check cache
      if (this.customerCache.has(searchKey)) {
        existingCustomer = this.customerCache.get(searchKey);
      } else {
        // Check DB
        const where: any[] = [];
        if (customerData.fiscalCode) where.push({ fiscalCode: customerData.fiscalCode.toUpperCase(), tenantId });
        if (customerData.email) where.push({ email: customerData.email.toLowerCase(), tenantId });
        if (customerData.phone) where.push({ phone: customerData.phone.replace(/\D/g, ''), tenantId });
        
        if (where.length > 0) {
          existingCustomer = await this.customerRepository.findOne({ where: where });
          if (existingCustomer) {
            this.customerCache.set(searchKey, existingCustomer);
          }
        }
      }
    }

    if (existingCustomer) {
      warnings.push(`Cliente esistente trovato: ${existingCustomer.firstName} ${existingCustomer.lastName}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      data: {
        customer: customerData,
        practice: practiceData,
        hasPractice: hasPracticeData,
        existingCustomer,
      },
      hasPractice: hasPracticeData,
    };
  }

  async processRow(row: any, mappingConfig: any, tenantId: string, userId: string, strategy: string): Promise<any> {
    const validation = await this.validateRow(row, mappingConfig, tenantId);
    
    if (!validation.valid) {
      throw new Error(`Validazione fallita: ${validation.errors.join(', ')}`);
    }

    const { customer: customerData, practice: practiceData, existingCustomer } = validation.data;
    
    let customer;
    let practice;
    let action = '';

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Gestione cliente in base alla strategia
      if (existingCustomer) {
        if (strategy === 'SKIP') {
          customer = existingCustomer;
          action = 'EXISTING_CUSTOMER_SKIP';
        } else if (strategy === 'UPDATE') {
          // Aggiorna dati cliente
          Object.assign(existingCustomer, customerData);
          customer = await queryRunner.manager.save(Customer, existingCustomer);
          action = 'EXISTING_CUSTOMER_UPDATE';
        } else {
          // CREATE_NEW - crea nuovo comunque
          customer = await this.createCustomer(customerData, tenantId, queryRunner);
          action = 'NEW_CUSTOMER_FORCED';
        }
      } else {
        customer = await this.createCustomer(customerData, tenantId, queryRunner);
        action = 'NEW_CUSTOMER_CREATED';
      }

      // Crea pratica se ci sono dati
      if (validation.hasPractice && customer) {
        practice = await this.createPractice(practiceData, tenantId, customer.id, userId, queryRunner);
        action += '_PRACTICE_CREATED';
      }

      await queryRunner.commitTransaction();
      
      return {
        customer,
        practice,
        action,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async createCustomer(data: any, tenantId: string, queryRunner: any): Promise<Customer> {
    const customer = queryRunner.manager.create(Customer, {
      tenantId,
      firstName: data.firstName,
      lastName: data.lastName,
      fiscalCode: data.fiscalCode?.toUpperCase(),
      vatNumber: data.vatNumber,
      email: data.email?.toLowerCase(),
      phone: data.phone?.replace(/\D/g, ''),
      mobile: data.mobile?.replace(/\D/g, ''),
      address: data.address,
      city: data.city,
      postalCode: data.postalCode,
      province: data.province,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      birthPlace: data.birthPlace,
      source: 'IMPORT',
    });

    return await queryRunner.manager.save(customer);
  }

  private async createPractice(data: any, tenantId: string, customerId: string, userId: string, queryRunner: any): Promise<Practice> {
    const practice = queryRunner.manager.create(Practice, {
      tenantId,
      customerId,
      createdBy: userId,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      type: data.type?.toUpperCase(),
      status: data.status || 'PENDING',
      operationalStatus: data.operationalStatus || 'PENDING',
      offerCode: data.offerCode,
      offerName: data.offerName,
      offerCanone: parseFloat(data.offerCanone) || 0,
      offerAttivazione: parseFloat(data.offerAttivazione) || 0,
      offerVincolo: parseInt(data.offerVincolo) || 0,
      offerNote: data.offerNote,
      lineType: data.lineType,
      technology: data.technology,
      notes: data.notes,
      installationAddress: data.installationAddress,
      soldBy: data.soldBy,
      enteredBy: data.enteredBy,
      oldLineData: {
        ...(data.oldLineNumber && { phoneNumber: data.oldLineNumber }),
        ...(data.oldLineOperator && { operator: data.oldLineOperator }),
        ...(data.migrationCode && { migrationCode: data.migrationCode }),
      },
      paymentMethod: data.iban ? {
        type: 'iban',
        value: data.iban,
        iban: data.iban,
      } : undefined,
    });

    return await queryRunner.manager.save(practice);
  }

  private applyTransformer(value: any, transformer: string): any {
    if (!value) return value;
    const str = value.toString();

    switch (transformer) {
      case 'uppercase': return str.toUpperCase();
      case 'lowercase': return str.toLowerCase();
      case 'trim': return str.trim();
      case 'extract_price': 
        const match = str.match(/(\d+[.,]?\d*)/);
        return match ? match[1].replace(',', '.') : str;
      case 'normalize_phone':
        return str.replace(/[\s\-\(\)\.]/g, '');
      case 'normalize_cf':
        return str.toUpperCase().replace(/[^A-Z0-9]/g, '');
      
      case 'parse_date':
        const dateMatch = str.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
        if (dateMatch) {
          const [, day, month, year] = dateMatch;
          const fullYear = year.length === 2 ? (parseInt(year) > 50 ? `19${year}` : `20${year}`) : year;
          return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        if (str.match(/^\d{4}-\d{2}-\d{2}$/)) return str;
        return str;

      default: return value;
    }
  }
}