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
  matchedBy?: 'fiscalCode' | 'email' | 'phonePrimary' | 'none';
}

@Injectable()
export class UnifiedAdapter {
  private customerCache = new Map<string, Customer>();
  private readonly CACHE_LIMIT = 500;

  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Practice)
    private practiceRepository: Repository<Practice>,
    private dataSource: DataSource,
  ) {}

  resetCache(): void {
    this.customerCache.clear();
  }

  private detectTypeFromOfferName(offerName: string): string | null {
    if (!offerName) return null;
    const nameLower = offerName.toLowerCase();
    
    if (nameLower.includes('sky')) return 'SKY';
    if (nameLower.includes('vodafone')) return 'VODAFONE';
    if (nameLower.includes('wind') || nameLower.includes('tre')) return 'WINDTRE';
    if (nameLower.includes('iliad')) return 'ILIAD';
    if (nameLower.includes('iren')) return 'IREN';
    if (nameLower.includes('optima')) return 'OPTIMA';
    if (nameLower.includes('tim')) return 'TIM_FIBRA';
    
    return null;
  }

  private resolvePhonePrimary(data: any): { value: string | null; source: string } {
    if (data.phonePrimary) return { value: data.phonePrimary.replace(/\D/g, ''), source: 'phonePrimary' };
    if (data.mobile) return { value: data.mobile.replace(/\D/g, ''), source: 'mobile' };
    if (data.phone) return { value: data.phone.replace(/\D/g, ''), source: 'phone' };
    return { value: null, source: 'none' };
  }

  async validateRow(row: any, mapping: any, tenantId: string): Promise<UnifiedRowResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const customerData: any = {};
    const practiceData: any = {};
    let hasPractice = false;

    mapping.columns.forEach((col: any) => {
      let value = row[col.source];
      
      if (col.transformer && value) {
        value = this.applyTransformer(value, col.transformer);
      }

      if (this.isCustomerField(col.target)) {
        customerData[col.target] = value;
      } else if (this.isPracticeField(col.target)) {
        practiceData[col.target] = value;
        if (value && ['type', 'offerName', 'offerCode', 'pacchettiAggiuntivi'].includes(col.target)) {
          hasPractice = true;
        }
      }
    });

    const phoneResolved = this.resolvePhonePrimary(customerData);
    if (phoneResolved.value) {
      customerData.phonePrimary = phoneResolved.value;
    }

    let practiceType = practiceData.type;

    if (!practiceType && practiceData.offerName) {
      practiceType = this.detectTypeFromOfferName(practiceData.offerName);
    }

    if (mapping.forceType) {
      practiceType = mapping.forceType;
    }

    if (practiceType) {
      practiceData.type = practiceType.toUpperCase();
    }

    if (!customerData.firstName) errors.push('Nome obbligatorio');
    if (!customerData.lastName) errors.push('Cognome obbligatorio');

    if (!customerData.phonePrimary) {
      if (customerData.fiscalCode || customerData.email) {
        warnings.push('Telefono primario mancante - verrà generato un placeholder');
      } else {
        errors.push('Telefono richiesto: mappa "Telefono Primario", "Mobile" o "Phone" oppure aggiungi CF o Email');
      }
    }

    const hasIdentifier = customerData.fiscalCode || customerData.email || customerData.phonePrimary;
    if (!hasIdentifier) {
      errors.push('Inserire almeno uno tra: Codice Fiscale, Email o Telefono');
    }

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

    if (hasPractice) {
      if (!practiceType) {
        errors.push('Impossibile rilevare il tipo pratica. Mappa il campo "Tipo" o usa "Forza tipo" nelle impostazioni');
      } else {
        const validTypes = ['TIM_FIBRA', 'VODAFONE', 'WINDTRE', 'ILIAD', 'OPTIMA', 'IREN', 'SKY'];
        if (!validTypes.includes(practiceType.toUpperCase())) {
          errors.push(`Tipo pratica non valido: ${practiceType}. Validi: ${validTypes.join(', ')}`);
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

    if (!customerData.phonePrimary) {
      if (customerData.fiscalCode || customerData.email) {
        customerData.phonePrimary = '0000000000';
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
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

  private async findOrCreateCustomerSmart(
    data: any,
    tenantId: string,
    strategy: 'SKIP' | 'UPDATE' | 'CREATE_NEW',
    queryRunner: any,
  ): Promise<{ customer: Customer; isNew: boolean; matchedBy: string }> {
    
    const normalizedCF = data.fiscalCode?.toString().trim().toUpperCase() || '';
    const normalizedEmail = data.email?.toString().trim().toLowerCase() || '';
    const normalizedPhone = data.phonePrimary?.toString().trim().replace(/\D/g, '') || '';

    let existing: Customer | undefined;
    let matchedBy = 'none';

    if (normalizedCF && this.customerCache.has(`cf:${normalizedCF}`)) {
      existing = this.customerCache.get(`cf:${normalizedCF}`);
      matchedBy = 'fiscalCode (cache)';
    } else if (normalizedEmail && this.customerCache.has(`email:${normalizedEmail}`)) {
      existing = this.customerCache.get(`email:${normalizedEmail}`);
      matchedBy = 'email (cache)';
    } else if (normalizedPhone && this.customerCache.has(`phone:${normalizedPhone}`)) {
      existing = this.customerCache.get(`phone:${normalizedPhone}`);
      matchedBy = 'phonePrimary (cache)';
    }

    if (!existing) {
      if (normalizedCF) {
        existing = await queryRunner.manager.findOne(Customer, {
          where: { fiscalCode: normalizedCF, tenantId },
        });
        if (existing) matchedBy = 'fiscalCode';
      }

      if (!existing && normalizedEmail) {
        existing = await queryRunner.manager.findOne(Customer, {
          where: { email: normalizedEmail, tenantId },
        });
        if (existing) matchedBy = 'email';
      }

      if (!existing && normalizedPhone && normalizedPhone !== '0000000000') {
        existing = await queryRunner.manager
          .createQueryBuilder(Customer, 'customer')
          .where('customer.tenantId = :tenantId', { tenantId })
          .andWhere("REGEXP_REPLACE(customer.phonePrimary, '\\D', '', 'g') = :phone", { phone: normalizedPhone })
          .getOne();
        if (existing) matchedBy = 'phonePrimary';
      }
    }

    if (existing) {
      if (strategy === 'SKIP') {
        this.updateCache(existing, normalizedCF, normalizedEmail, normalizedPhone);
        return { customer: existing, isNew: false, matchedBy };
      }

      if (strategy === 'UPDATE') {
        if (data.firstName) existing.firstName = data.firstName;
        if (data.lastName) existing.lastName = data.lastName;
        if (data.email) existing.email = data.email;
        if (data.fiscalCode && !existing.fiscalCode) existing.fiscalCode = normalizedCF;
        if (data.phonePrimary && data.phonePrimary !== '0000000000') existing.phonePrimary = data.phonePrimary;
        if (data.phoneSecondary) existing.phoneSecondary = data.phoneSecondary.replace(/\D/g, '');
        
        // 🔥 FIX: Usa 'as any' per bypassare il type checking rigido
        if (data.wash || data.pacchettiAggiuntivi) {
          const currentMetadata = (existing.importMetadata || {}) as any;
          existing.importMetadata = {
            ...currentMetadata,
            wash: data.wash,
            pacchettiAggiuntivi: data.pacchettiAggiuntivi,
            updatedAt: new Date().toISOString()
          };
        }
        
        existing = await queryRunner.manager.save(existing);
      }

      this.updateCache(existing, normalizedCF, normalizedEmail, normalizedPhone);
      return { customer: existing, isNew: false, matchedBy };
    }

    // 🔥 FIX: Usa 'as any' per importMetadata flessibile
    const newCustomer = queryRunner.manager.create(Customer, {
      tenantId,
      firstName: data.firstName,
      lastName: data.lastName,
      fiscalCode: normalizedCF || null,
      email: data.email || null,
      phonePrimary: data.phonePrimary,
      phoneSecondary: data.phoneSecondary?.replace(/\D/g, '') || null,
      address: data.address || {},
      status: 'active',
      sourceImportJobId: data.importJobId,
      importMetadata: {
        wash: data.wash,
        phonePlaceholder: data.phonePrimary === '0000000000',
        rawDataSnapshot: data,
        importedAt: new Date().toISOString()
      } as any // 🔥 Cast a any per permettere campi extra
    });

    const saved = await queryRunner.manager.save(newCustomer);
    this.updateCache(saved, normalizedCF, normalizedEmail, normalizedPhone);
    
    return { customer: saved, isNew: true, matchedBy: 'created' };
  }

  private updateCache(customer: Customer, cf: string, email: string, phone: string) {
    if (this.customerCache.size >= this.CACHE_LIMIT) {
      const firstKey = this.customerCache.keys().next().value;
      this.customerCache.delete(firstKey);
    }

    if (cf) this.customerCache.set(`cf:${cf}`, customer);
    if (email) this.customerCache.set(`email:${email}`, customer);
    if (phone) this.customerCache.set(`phone:${phone}`, customer);
  }

  private async createPractice(
    data: any,
    customerId: string,
    tenantId: string,
    userId: string,
    queryRunner: any,
  ): Promise<Practice> {
    const practiceData: any = {
      tenantId,
      customerId,
      createdBy: userId,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      type: data.type?.toUpperCase() as PracticeType,
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
      soldBy: data.soldBy,
      enteredBy: data.enteredBy,
      oldLineData: {
        ...(data.oldLineNumber && { phoneNumber: data.oldLineNumber }),
        ...(data.migrationCode && { migrationCode: data.migrationCode }),
      },
      paymentMethod: data.iban ? { type: 'iban', value: data.iban } : undefined,
    };

    if (data.pacchettiAggiuntivi) {
      practiceData.offerNote = practiceData.offerNote 
        ? `${practiceData.offerNote} | Pacchetti: ${data.pacchettiAggiuntivi}`
        : `Pacchetti: ${data.pacchettiAggiuntivi}`;
    }

    const practice = queryRunner.manager.create(Practice, practiceData);
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
        return str.replace(/\D/g, '');
      case 'normalize_cf':
        return str.toUpperCase().replace(/[^A-Z0-9]/g, '');
      case 'parse_date':
        const parseDateMatch = str.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
        if (parseDateMatch) {
          const [, day, month, year] = parseDateMatch;
          const fullYear = year.length === 2 ? (parseInt(year) > 50 ? `19${year}` : `20${year}`) : year;
          return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        if (str.match(/^\d{4}-\d{2}-\d{2}$/)) return str;
        return str;
      default: return value;
    }
  }

  private isCustomerField(target: string): boolean {
    const fields = [
      'firstName', 'lastName', 'fiscalCode', 'email', 
      'phonePrimary', 'phoneSecondary',
      'mobile', 'phone',
      'vatNumber', 'address', 'customerSegment', 
      'status', 'notes', 'assignedTo',
      'wash'
    ];
    return fields.includes(target);
  }

  private isPracticeField(target: string): boolean {
    const fields = [
      'type', 'offerCode', 'offerName', 'offerCanone', 'offerAttivazione', 
      'offerVincolo', 'offerNote', 'offerDisattivazione', 'offerType', 
      'offerScadenza', 'status', 'operationalStatus', 'lineType', 
      'technology', 'notes', 'installationAddress', 'soldBy', 'enteredBy', 
      'migrationCode', 'iban', 'oldLineNumber', 'pacchettiAggiuntivi'
    ];
    return fields.includes(target);
  }

  getTargetFields(): Array<{ name: string; label: string; type: string; required: boolean; category: 'customer' | 'practice'; helpText?: string }> {
    return [
      { name: 'firstName', label: 'Nome', type: 'string', required: true, category: 'customer' },
      { name: 'lastName', label: 'Cognome', type: 'string', required: true, category: 'customer' },
      { name: 'fiscalCode', label: 'Codice Fiscale', type: 'string', required: false, category: 'customer', 
        helpText: 'Identificatore principale' },
      { name: 'email', label: 'Email', type: 'string', required: false, category: 'customer',
        helpText: 'Identificatore secondario' },
      { name: 'phonePrimary', label: 'Telefono Primario', type: 'string', required: false, category: 'customer',
        helpText: 'Obbligatorio in DB, ma fallback su Mobile/Phone, o placeholder se hai CF/Email' },
      { name: 'mobile', label: 'Cellulare (fallback)', type: 'string', required: false, category: 'customer',
        helpText: 'Usato come phonePrimary se vuoto' },
      { name: 'phone', label: 'Telefono (fallback)', type: 'string', required: false, category: 'customer',
        helpText: 'Alias per phonePrimary' },
      { name: 'phoneSecondary', label: 'Telefono Secondario', type: 'string', required: false, category: 'customer' },
      { name: 'wash', label: 'Wash (metadata)', type: 'string', required: false, category: 'customer',
        helpText: 'Campo wash salvato in importMetadata' },
      { name: 'vatNumber', label: 'Partita IVA', type: 'string', required: false, category: 'customer' },
      { name: 'address', label: 'Indirizzo (JSON)', type: 'string', required: false, category: 'customer' },
      { name: 'customerSegment', label: 'Segmento', type: 'string', required: false, category: 'customer' },
      { name: 'notes', label: 'Note', type: 'text', required: false, category: 'customer' },
      
      { name: 'type', label: 'Tipo Pratica', type: 'enum', required: false, category: 'practice',
        helpText: 'Auto-rilevato da Nome Offerta' },
      { name: 'offerName', label: 'Nome Offerta', type: 'string', required: false, category: 'practice' },
      { name: 'pacchettiAggiuntivi', label: 'Pacchetti Aggiuntivi', type: 'string', required: false, category: 'practice',
        helpText: 'Salvati nelle note offerta' },
      { name: 'offerCanone', label: 'Canone €', type: 'string', required: false, category: 'practice' },
      { name: 'offerAttivazione', label: 'Costo Attivazione', type: 'string', required: false, category: 'practice' },
      { name: 'offerVincolo', label: 'Vincolo (mesi)', type: 'string', required: false, category: 'practice' },
      { name: 'offerNote', label: 'Note Offerta', type: 'string', required: false, category: 'practice' },
      { name: 'createdAt', label: 'Data Inserimento', type: 'date', required: false, category: 'practice', 
        helpText: 'GG/MM/AAAA' },
      { name: 'operationalStatus', label: 'Stato Operativo', type: 'enum', required: false, category: 'practice' },
      { name: 'soldBy', label: 'Venduto Da', type: 'string', required: false, category: 'practice' },
      { name: 'enteredBy', label: 'Inserito Da', type: 'string', required: false, category: 'practice' },
      { name: 'migrationCode', label: 'Codice Migrazione', type: 'string', required: false, category: 'practice' },
      { name: 'iban', label: 'IBAN', type: 'string', required: false, category: 'practice' },
      { name: 'oldLineNumber', label: 'Numero Vecchia Linea', type: 'string', required: false, category: 'practice' },
      { name: 'technology', label: 'Tecnologia', type: 'string', required: false, category: 'practice' },
      { name: 'lineType', label: 'Tipo Linea', type: 'string', required: false, category: 'practice' },
      { name: 'notes', label: 'Note Pratica', type: 'text', required: false, category: 'practice' },
    ];
  }
}