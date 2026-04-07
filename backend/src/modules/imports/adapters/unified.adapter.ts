import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { Practice, PracticeType } from '../../practices/entities/practice.entity';
import { CommonValidators } from '../validators/common.validators';

export interface UnifiedRowResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  data: {
    customer: Partial<Customer>;
    practice?: Partial<Practice>;
    hasPractice: boolean;
  };
  matchedBy?: 'fiscalCode' | 'email' | 'phone' | 'none';
}

@Injectable()
export class UnifiedAdapter {
  // Cache LRU (Least Recently Used) con limite 500 per sicurezza memoria
  private customerCache = new Map<string, Customer>();
  private emailCache = new Map<string, Customer>();
  private phoneCache = new Map<string, Customer>();
  private readonly CACHE_LIMIT = 500;

  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Practice)
    private practiceRepository: Repository<Practice>,
    private dataSource: DataSource, // Per transazioni
  ) {}

  resetCache(): void {
    this.customerCache.clear();
    this.emailCache.clear();
    this.phoneCache.clear();
  }

  /**
   * Validazione completa riga con supporto multi-formato
   */
  async validateRow(row: any, mapping: any, tenantId: string): Promise<UnifiedRowResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const customerData: any = {};
    const practiceData: any = {};
    let hasPractice = false;

    // Estrazione dati
    mapping.columns.forEach((col: any) => {
      let value = row[col.source];
      
      if (col.transformer && value) {
        value = this.applyTransformer(value, col.transformer);
      }

      if (this.isCustomerField(col.target)) {
        customerData[col.target] = value;
      } else if (this.isPracticeField(col.target)) {
        practiceData[col.target] = value;
        if (value && ['type', 'offerName', 'offerCode'].includes(col.target)) {
          hasPractice = true;
        }
      }
    });

    // Validazione Cliente (almeno un identificatore necessario)
    if (!customerData.firstName) errors.push('Nome obbligatorio');
    if (!customerData.lastName) errors.push('Cognome obbligatorio');

    const hasIdentifier = customerData.fiscalCode || customerData.email || customerData.phonePrimary;
    if (!hasIdentifier) {
      errors.push('Inserire almeno uno tra: Codice Fiscale, Email o Telefono');
    }

    // Validazioni specifiche
    if (customerData.fiscalCode) {
      const cfValidation = CommonValidators.fiscalCode(customerData.fiscalCode);
      if (!cfValidation.valid) warnings.push(`CF non valido: ${cfValidation.error}`);
    }

    if (customerData.email) {
      const emailValidation = CommonValidators.email(customerData.email);
      if (!emailValidation.valid) errors.push(`Email non valida: ${emailValidation.error}`);
    }

    if (customerData.phonePrimary) {
      const phoneValidation = CommonValidators.phone(customerData.phonePrimary);
      if (!phoneValidation.valid) warnings.push(`Telefono non valido: ${phoneValidation.error}`);
    }

    // Validazione Pratica (solo se presenti dati)
    if (hasPractice) {
      if (!practiceData.type) {
        errors.push('Tipo pratica obbligatorio se si inseriscono dati pratica');
      } else {
        const validTypes = ['TIM_FIBRA', 'VODAFONE', 'WINDTRE', 'ILIAD', 'OPTIMA', 'IREN', 'SKY'];
        if (!validTypes.includes(practiceData.type.toUpperCase())) {
          errors.push(`Tipo pratica non valido: ${practiceData.type}. Validi: ${validTypes.join(', ')}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      data: {
        customer: customerData,
        practice: hasPractice ? practiceData : undefined,
        hasPractice,
      },
    };
  }

  /**
   * Processa riga con transazione atomica
   */
  async processRow(
    row: any,
    mapping: any,
    tenantId: string,
    userId: string,
    duplicateStrategy: 'SKIP' | 'UPDATE' | 'CREATE_NEW',
  ): Promise<{ customer?: Customer; practice?: Practice; action: string }> {
    
    const validation = await this.validateRow(row, mapping, tenantId);
    if (!validation.valid) {
      throw new Error(validation.errors.join('; '));
    }

    const { customer: customerData, practice: practiceData, hasPractice } = validation.data;

    // QueryRunner per transazione
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Smart Match con Cache LRU
      const customerResult = await this.findOrCreateCustomerSmart(
        customerData, 
        tenantId, 
        duplicateStrategy,
        queryRunner
      );

      let practice: Practice | undefined;
      
      if (hasPractice && practiceData) {
        practice = await this.createPractice(
          practiceData, 
          customerResult.customer.id, 
          tenantId, 
          userId,
          queryRunner
        );
      }

      await queryRunner.commitTransaction();

      return {
        customer: customerResult.customer,
        practice,
        action: this.buildActionString(customerResult, hasPractice, !!practice),
      };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Smart Match: CF -> Email -> Telefono con Cache LRU
   */
  private async findOrCreateCustomerSmart(
    data: any,
    tenantId: string,
    strategy: 'SKIP' | 'UPDATE' | 'CREATE_NEW',
    queryRunner: any,
  ): Promise<{ customer: Customer; isNew: boolean; matchedBy: string }> {
    
    const normalizedCF = data.fiscalCode?.toString().trim().toUpperCase() || '';
    const normalizedEmail = data.email?.toString().trim().toLowerCase() || '';
    const normalizedPhone = data.phonePrimary?.toString().trim().replace(/[\s\-\(\)\.]/g, '') || '';

    let existing: Customer | undefined;
    let matchedBy = 'none';

    // 1. Cache Lookup
    if (normalizedCF && this.customerCache.has(normalizedCF)) {
      existing = this.customerCache.get(normalizedCF);
      matchedBy = 'fiscalCode (cache)';
    } else if (normalizedEmail && this.emailCache.has(normalizedEmail)) {
      existing = this.emailCache.get(normalizedEmail);
      matchedBy = 'email (cache)';
    } else if (normalizedPhone && this.phoneCache.has(normalizedPhone)) {
      existing = this.phoneCache.get(normalizedPhone);
      matchedBy = 'phone (cache)';
    }

    // 2. DB Lookup se non in cache
    if (!existing) {
      // Priorità: CF -> Email -> Telefono
      if (normalizedCF) {
        existing = await queryRunner.manager.findOne(Customer, {
          where: { fiscalCode: normalizedCF, tenantId },
        });
        if (existing) matchedBy = 'fiscalCode';
      }

      if (!existing && normalizedEmail) {
        existing = await queryRunner.manager
          .createQueryBuilder(Customer, 'customer')
          .where('customer.tenantId = :tenantId', { tenantId })
          .andWhere('LOWER(TRIM(customer.email)) = :email', { email: normalizedEmail })
          .getOne();
        if (existing) matchedBy = 'email';
      }

      if (!existing && normalizedPhone) {
        existing = await queryRunner.manager
          .createQueryBuilder(Customer, 'customer')
          .where('customer.tenantId = :tenantId', { tenantId })
          .andWhere("REGEXP_REPLACE(customer.phonePrimary, '[\\s\\-\\(\\)\\.]', '', 'g') = :phone", { phone: normalizedPhone })
          .getOne();
        if (existing) matchedBy = 'phone';
      }
    }

    // Gestione cliente esistente
    if (existing) {
      if (strategy === 'SKIP') {
        this.updateCache(existing, normalizedCF, normalizedEmail, normalizedPhone);
        return { customer: existing, isNew: false, matchedBy };
      }

      if (strategy === 'UPDATE') {
        // Merge intelligente: nuovi dati prevalgono solo se validi
        if (data.firstName) existing.firstName = data.firstName;
        if (data.lastName) existing.lastName = data.lastName;
        if (data.phonePrimary) existing.phonePrimary = data.phonePrimary;
        if (data.phoneSecondary) existing.phoneSecondary = data.phoneSecondary;
        if (data.email) existing.email = data.email;
        if (data.fiscalCode && !existing.fiscalCode) existing.fiscalCode = normalizedCF;
        
        existing = await queryRunner.manager.save(existing);
      }

      this.updateCache(existing, normalizedCF, normalizedEmail, normalizedPhone);
      return { customer: existing, isNew: false, matchedBy };
    }

    // Creazione nuovo cliente
    const newCustomer = queryRunner.manager.create(Customer, {
      tenantId,
      firstName: data.firstName,
      lastName: data.lastName,
      fiscalCode: normalizedCF || null,
      phonePrimary: data.phonePrimary,
      phoneSecondary: data.phoneSecondary,
      email: data.email,
      address: data.address || {},
      status: 'active',
      sourceImportJobId: data.importJobId, // Tracciamento
    });

    const saved = await queryRunner.manager.save(newCustomer);
    this.updateCache(saved, normalizedCF, normalizedEmail, normalizedPhone);
    
    return { customer: saved, isNew: true, matchedBy: 'created' };
  }

  /**
   * Gestione Cache LRU (rimuove il più vecchio se oltre limite)
   */
  private updateCache(customer: Customer, cf: string, email: string, phone: string) {
    // Se cache piena, rimuovi il primo (più vecchio)
    if (this.customerCache.size >= this.CACHE_LIMIT) {
      const firstKey = this.customerCache.keys().next().value;
      this.customerCache.delete(firstKey);
    }

    if (cf) this.customerCache.set(cf, customer);
    if (email) this.emailCache.set(email, customer);
    if (phone) this.phoneCache.set(phone, customer);
  }

  private async createPractice(
    data: any,
    customerId: string,
    tenantId: string,
    userId: string,
    queryRunner: any,
  ): Promise<Practice> {
    const practice = queryRunner.manager.create(Practice, {
      tenantId,
      customerId,
      createdBy: userId,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(), // ✅ Usa data importata o ora corrente
      type: data.type.toUpperCase() as PracticeType,
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
      sourceImportJobId: data.importJobId,
    });

    return await queryRunner.manager.save(practice);
  }

  private buildActionString(
    customerResult: { isNew: boolean; matchedBy: string }, 
    hasPractice: boolean, 
    practiceCreated: boolean
  ): string {
    const parts: string[] = [];
    
    if (customerResult.isNew) {
      parts.push('CREATED_CUSTOMER');
    } else {
      parts.push(`UPDATED_CUSTOMER[${customerResult.matchedBy}]`);
    }

    if (hasPractice) {
      if (practiceCreated) {
        parts.push('CREATED_PRACTICE');
      } else {
        parts.push('PRACTICE_FAILED');
      }
    }

    return parts.join('_');
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
      case 'parse_date':  // ✅ AGGIUNTO
        // Converte DD/MM/YYYY o DD-MM-YYYY in YYYY-MM-DD per il DB
        const dateMatch = str.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
        if (dateMatch) {
          const [, day, month, year] = dateMatch;
          const fullYear = year.length === 2 ? (parseInt(year) > 50 ? `19${year}` : `20${year}`) : year;
          return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        // Se già in formato ISO (YYYY-MM-DD), lascia così
        if (str.match(/^\d{4}-\d{2}-\d{2}$/)) return str;
        return str;
      default: return value;
    }
  }

  private isCustomerField(target: string): boolean {
    const fields = ['firstName', 'lastName', 'fiscalCode', 'email', 'phonePrimary', 
                   'phoneSecondary', 'address', 'vatNumber', 'customerSegment', 'notes'];
    return fields.includes(target);
  }

  private isPracticeField(target: string): boolean {
    const fields = ['type', 'offerCode', 'offerName', 'offerCanone', 'offerAttivazione', 
                   'offerVincolo', 'offerNote', 'offerDisattivazione', 'offerType', 
                   'offerScadenza', 'status', 'operationalStatus', 'lineType', 
                   'technology', 'notes', 'installationAddress', 'soldBy', 'enteredBy', 'createdAt'];  // ✅ AGGIUNTO createdAt
    return fields.includes(target);
  }

  getTargetFields(): Array<{ name: string; label: string; type: string; required: boolean; category: 'customer' | 'practice'; helpText?: string }> {
    return [
      // CLIENTE
      { name: 'firstName', label: 'Nome', type: 'string', required: true, category: 'customer' },
      { name: 'lastName', label: 'Cognome', type: 'string', required: true, category: 'customer' },
      { name: 'fiscalCode', label: 'Codice Fiscale', type: 'string', required: false, category: 'customer', 
        helpText: 'Identificatore principale. Se mancante, usa Email o Telefono.' },
      { name: 'email', label: 'Email', type: 'string', required: false, category: 'customer',
        helpText: 'Usata come chiave secondaria se CF mancante' },
      { name: 'phonePrimary', label: 'Telefono', type: 'string', required: false, category: 'customer',
        helpText: 'Usato come chiave terziaria. Formato: +39 o 0xx' },
      { name: 'phoneSecondary', label: 'Telefono 2', type: 'string', required: false, category: 'customer' },
      { name: 'vatNumber', label: 'Partita IVA', type: 'string', required: false, category: 'customer' },
      
      // PRATICA (opzionali - se almeno uno c'è, crea pratica)
      { name: 'type', label: 'Tipo Pratica *', type: 'enum', required: false, category: 'practice',
        helpText: 'Obbligatorio se si vuole creare una pratica. Valori: TIM_FIBRA, VODAFONE, WINDTRE, ILIAD, OPTIMA, IREN, SKY' },
      { name: 'offerName', label: 'Nome Offerta', type: 'string', required: false, category: 'practice' },
      { name: 'offerCanone', label: 'Canone €', type: 'string', required: false, category: 'practice' },
      { name: 'offerAttivazione', label: 'Costo Attivazione', type: 'string', required: false, category: 'practice' },
      { name: 'offerVincolo', label: 'Vincolo (mesi)', type: 'string', required: false, category: 'practice' },
      { name: 'offerNote', label: 'Note Offerta', type: 'string', required: false, category: 'practice' },
      { name: 'createdAt', label: 'Data Inserimento Pratica', type: 'date', required: false, category: 'practice', helpText: 'Data originale dal vecchio sistema. Formato: GG/MM/AAAA o AAAA-MM-DD' },  // ✅ AGGIUNTO
      { name: 'technology', label: 'Tecnologia', type: 'string', required: false, category: 'practice',
        helpText: 'FTTH, FTTC, ADSL, etc.' },
      { name: 'lineType', label: 'Tipo Linea', type: 'string', required: false, category: 'practice',
        helpText: 'Nuova, Migrazione, Subentro' },
      { name: 'status', label: 'Stato', type: 'enum', required: false, category: 'practice' },
      { name: 'operationalStatus', label: 'Stato Operativo', type: 'enum', required: false, category: 'practice' },
      { name: 'notes', label: 'Note', type: 'text', required: false, category: 'practice' },
    ];
  }
}