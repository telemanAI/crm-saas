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
  matchedBy?: 'fiscalCode' | 'email' | 'none';
}

@Injectable()
export class UnifiedAdapter {
  // Cache semplificata: solo CF e Email
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

  /**
   * Rileva automaticamente il tipo pratica dal nome offerta
   */
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

  /**
   * Validazione completa riga con supporto multi-formato + Auto-detect + ForceType
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

    // SMART DETECTION: Determina il tipo pratica
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

    // Validazione Cliente - Solo CF o Email
    if (!customerData.firstName) errors.push('Nome obbligatorio');
    if (!customerData.lastName) errors.push('Cognome obbligatorio');

    const hasIdentifier = customerData.fiscalCode || customerData.email;
    if (!hasIdentifier) {
      errors.push('Inserire almeno uno tra: Codice Fiscale o Email');
    }

    if (customerData.fiscalCode) {
      const cfValidation = CommonValidators.fiscalCode(customerData.fiscalCode);
      if (!cfValidation.valid) warnings.push(`CF non valido: ${cfValidation.error}`);
    }

    if (customerData.email) {
      const emailValidation = CommonValidators.email(customerData.email);
      if (!emailValidation.valid) errors.push(`Email non valida: ${emailValidation.error}`);
    }

    // Validazione Pratica
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

  /**
   * Smart Match SOLO su CF e Email
   */
  private async findOrCreateCustomerSmart(
    data: any,
    tenantId: string,
    strategy: 'SKIP' | 'UPDATE' | 'CREATE_NEW',
    queryRunner: any,
  ): Promise<{ customer: Customer; isNew: boolean; matchedBy: string }> {
    
    const normalizedCF = data.fiscalCode?.toString().trim().toUpperCase() || '';
    const normalizedEmail = data.email?.toString().trim().toLowerCase() || '';

    let existing: Customer | undefined;
    let matchedBy = 'none';

    // 1. Cache Lookup
    if (normalizedCF && this.customerCache.has(`cf:${normalizedCF}`)) {
      existing = this.customerCache.get(`cf:${normalizedCF}`);
      matchedBy = 'fiscalCode (cache)';
    } else if (normalizedEmail && this.customerCache.has(`email:${normalizedEmail}`)) {
      existing = this.customerCache.get(`email:${normalizedEmail}`);
      matchedBy = 'email (cache)';
    }

    // 2. DB Lookup
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
    }

    // Gestione cliente esistente
    if (existing) {
      if (strategy === 'SKIP') {
        this.updateCache(existing, normalizedCF, normalizedEmail);
        return { customer: existing, isNew: false, matchedBy };
      }

      if (strategy === 'UPDATE') {
        // Aggiorna solo campi che esistono sicuramente
        if (data.firstName) existing.firstName = data.firstName;
        if (data.lastName) existing.lastName = data.lastName;
        if (data.email) existing.email = data.email;
        if (data.fiscalCode && !existing.fiscalCode) existing.fiscalCode = normalizedCF;
        // 🔥 RIMOSSO: telefono - campo non esiste o ha nome diverso
        
        existing = await queryRunner.manager.save(existing);
      }

      this.updateCache(existing, normalizedCF, normalizedEmail);
      return { customer: existing, isNew: false, matchedBy };
    }

    // Creazione nuovo cliente - solo campi sicuri
    const newCustomer = queryRunner.manager.create(Customer, {
      tenantId,
      firstName: data.firstName,
      lastName: data.lastName,
      fiscalCode: normalizedCF || null,
      email: data.email,
      // 🔥 RIMOSSO: campo telefono non esiste nell'entità
      address: data.address || {},
      status: 'active',
      sourceImportJobId: data.importJobId,
    });

    const saved = await queryRunner.manager.save(newCustomer);
    this.updateCache(saved, normalizedCF, normalizedEmail);
    
    return { customer: saved, isNew: true, matchedBy: 'created' };
  }

  private updateCache(customer: Customer, cf: string, email: string) {
    if (this.customerCache.size >= this.CACHE_LIMIT) {
      const firstKey = this.customerCache.keys().next().value;
      this.customerCache.delete(firstKey);
    }

    if (cf) this.customerCache.set(`cf:${cf}`, customer);
    if (email) this.customerCache.set(`email:${email}`, customer);
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
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
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
      soldBy: data.soldBy,
      enteredBy: data.enteredBy,
      oldLineData: {
        ...(data.oldLineNumber && { phoneNumber: data.oldLineNumber }),
        ...(data.migrationCode && { migrationCode: data.migrationCode }),
      },
      paymentMethod: data.iban ? { type: 'iban', value: data.iban } : undefined,
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
    // 🔥 Solo campi che esistono sicuramente nell'entità
    const fields = ['firstName', 'lastName', 'fiscalCode', 'email', 
                   'address', 'vatNumber', 'notes', 'city', 'postalCode', 'province'];
    return fields.includes(target);
  }

  private isPracticeField(target: string): boolean {
    const fields = ['type', 'offerCode', 'offerName', 'offerCanone', 'offerAttivazione', 
                   'offerVincolo', 'offerNote', 'offerDisattivazione', 'offerType', 
                   'offerScadenza', 'status', 'operationalStatus', 'lineType', 
                   'technology', 'notes', 'installationAddress', 'soldBy', 'enteredBy', 
                   'migrationCode', 'iban', 'oldLineNumber'];
    return fields.includes(target);
  }

  getTargetFields(): Array<{ name: string; label: string; type: string; required: boolean; category: 'customer' | 'practice'; helpText?: string }> {
    return [
      { name: 'firstName', label: 'Nome', type: 'string', required: true, category: 'customer' },
      { name: 'lastName', label: 'Cognome', type: 'string', required: true, category: 'customer' },
      { name: 'fiscalCode', label: 'Codice Fiscale', type: 'string', required: false, category: 'customer', 
        helpText: 'Identificatore principale per il matching' },
      { name: 'email', label: 'Email', type: 'string', required: false, category: 'customer',
        helpText: 'Identificatore secondario. Deve essere univoca.' },
      { name: 'vatNumber', label: 'Partita IVA', type: 'string', required: false, category: 'customer' },
      { name: 'address', label: 'Indirizzo', type: 'string', required: false, category: 'customer' },
      { name: 'city', label: 'Città', type: 'string', required: false, category: 'customer' },
      { name: 'postalCode', label: 'CAP', type: 'string', required: false, category: 'customer' },
      
      { name: 'type', label: 'Tipo Pratica', type: 'enum', required: false, category: 'practice',
        helpText: 'Auto-rilevato da Nome Offerta se non mappato' },
      { name: 'offerName', label: 'Nome Offerta', type: 'string', required: false, category: 'practice',
        helpText: 'Usato per auto-rilevare il gestore (es. "Sky Q" -> SKY)' },
      { name: 'offerCanone', label: 'Canone €', type: 'string', required: false, category: 'practice' },
      { name: 'offerAttivazione', label: 'Costo Attivazione', type: 'string', required: false, category: 'practice' },
      { name: 'offerVincolo', label: 'Vincolo (mesi)', type: 'string', required: false, category: 'practice' },
      { name: 'offerNote', label: 'Note Offerta', type: 'string', required: false, category: 'practice' },
      { name: 'createdAt', label: 'Data Inserimento Pratica', type: 'date', required: false, category: 'practice', helpText: 'Formato: GG/MM/AAAA o AAAA-MM-DD' },
      { name: 'operationalStatus', label: 'Stato Operativo', type: 'enum', required: false, category: 'practice' },
      { name: 'soldBy', label: 'Venduto Da (nome)', type: 'string', required: false, category: 'practice' },
      { name: 'enteredBy', label: 'Inserito Da (nome)', type: 'string', required: false, category: 'practice' },
      { name: 'migrationCode', label: 'Codice Migrazione', type: 'string', required: false, category: 'practice' },
      { name: 'iban', label: 'IBAN', type: 'string', required: false, category: 'practice' },
      { name: 'oldLineNumber', label: 'Numero Vecchia Linea', type: 'string', required: false, category: 'practice' },
      { name: 'technology', label: 'Tecnologia', type: 'string', required: false, category: 'practice' },
      { name: 'lineType', label: 'Tipo Linea', type: 'string', required: false, category: 'practice' },
      { name: 'status', label: 'Stato', type: 'enum', required: false, category: 'practice' },
      { name: 'notes', label: 'Note', type: 'text', required: false, category: 'practice' },
    ];
  }
}