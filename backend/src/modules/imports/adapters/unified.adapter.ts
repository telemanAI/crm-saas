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

    // Normalizza: lowercase, rimuovi spazi, trattini, underscore
    const normalized = offerName.toLowerCase().replace(/[\s\-_]/g, '');

    // 🔥 ORDINE IMPORTANTE: dai più specifici ai più generici

    // SKY (sky tv, sky wifi, sky fibra)
    if (normalized.includes('sky')) return 'SKY';

    // FASTWEB (fastweb, fast web)
    if (normalized.includes('fastweb')) return 'FASTWEB';

    // TISCALI (tiscali, tiscali fibra)
    if (normalized.includes('tiscali')) return 'TISCALI';

    // LINKEM (linkem, linkem fibra)
    if (normalized.includes('linkem')) return 'LINKEM';

    // PLENITUDE/ENI (plenitude, eni, eni fibra)
    if (normalized.includes('plenitude') || normalized.includes('eni')) return 'PLENITUDE';

    // ENEL (enel, enel energia, enel fibra)
    if (normalized.includes('enel')) return 'ENEL';

    // POSTEMOBILE (postemobile, poste mobile)
    if (normalized.includes('postemobile') || normalized.includes('poste')) return 'POSTEMOBILE';

    // COOPVOCE (coopvoce, coop voce)
    if (normalized.includes('coopvoce') || normalized.includes('coop')) return 'COOPVOCE';

    // VODAFONE (vodafone, vodafone fibra, voda)
    if (normalized.includes('vodafone') || normalized.includes('voda')) return 'VODAFONE';

    // WINDTRE (windtre, wind tre, wind3, wind e tre, wind, tre)
    // NOTA: Wind e Tre sono SEMPRE insieme come WINDTRE, mai separati
    if (normalized.includes('wind') || normalized.includes('tre') || 
        normalized.includes('windtre') || normalized.includes('wind3') ||
        normalized.includes('3italia')) return 'WINDTRE';

    // ILIAD (iliad, iliad fibra)
    if (normalized.includes('iliad')) return 'ILIAD';

    // IREN (iren, iren luce gas, iren fibra)
    if (normalized.includes('iren')) return 'IREN';

    // OPTIMA (optima, optima mobile, optima fibra)
    if (normalized.includes('optima')) return 'OPTIMA';

    // TIM (tim, tim fibra, timfibo, tim casa)
    if (normalized.includes('tim')) return 'TIM_FIBRA';

    return null;
  }

  /**
   * 🔥 FIX: Gestione flessibile del telefono con conversione esplicita a String
   */
  private resolvePhonePrimary(data: any): { value: string | null; source: string } {
    if (data.phonePrimary) {
      return { 
        value: String(data.phonePrimary).replace(/\D/g, ''), 
        source: 'phonePrimary' 
      };
    }
    if (data.mobile) {
      return { 
        value: String(data.mobile).replace(/\D/g, ''), 
        source: 'mobile' 
      };
    }
    if (data.phone) {
      return { 
        value: String(data.phone).replace(/\D/g, ''), 
        source: 'phone' 
      };
    }
    return { value: null, source: 'none' };
  }

  /**
   * 🔥 FIX: Logica intelligente WASH
   * Se contiene "NO" (prima o con WASH) → NON è wash
   * Se contiene "WASH" o "SI" → È wash (suspect)
   */
  private parseWashConfig(washValue: any): { enabled: boolean; type: 'suspect' | 'none' } | null {
    if (!washValue) return null;

    const value = String(washValue).toLowerCase().trim();

    console.log('[WASH DEBUG] Parsing value:', value);

    // Se c'è "no" o "nowash" → NON è wash (ha precedenza)
    if (value.includes('no') || value.includes('nowash')) {
      console.log('[WASH DEBUG] Riconosciuto NO WASH');
      return { enabled: false, type: 'none' };
    }

    // Se c'è "si", "wash", "suspect" → È wash suspect
    if (value.includes('si') || value.includes('wash') || value.includes('suspect')) {
      console.log('[WASH DEBUG] Riconosciuto WASH');
      return { enabled: true, type: 'suspect' };
    }

    console.log('[WASH DEBUG] Nessun match, ritorno null');
    return null;
  }

  /**
   * 🔥 NUOVO: Parsing convergenza da stringa/JSON
   */
  private parseConvergenza(convValue: any): { attiva: boolean; tipo: 'daChiudere' | 'chiusa' | null; numero?: string } | null {
    if (!convValue) return null;

    // Se è già un oggetto
    if (typeof convValue === 'object' && convValue !== null) {
      return {
        attiva: convValue.attiva || false,
        tipo: convValue.tipo || null,
        numero: convValue.numero || undefined
      };
    }

    // Se è stringa, prova a parsarla come JSON
    const str = String(convValue).trim();
    if (str.startsWith('{')) {
      try {
        const parsed = JSON.parse(str);
        return {
          attiva: parsed.attiva || false,
          tipo: parsed.tipo || null,
          numero: parsed.numero || undefined
        };
      } catch (e) {
        // Non è JSON valido, continua con parsing semplice
      }
    }

    // Parsing semplice da stringa
    const lower = str.toLowerCase();
    if (lower.includes('dachiudere') || lower.includes('da chiudere')) {
      return { attiva: true, tipo: 'daChiudere' };
    }
    if (lower.includes('chiusa') || lower.includes('completa')) {
      // Estrai numero se presente (es. "Chiusa 3201234567")
      const numeroMatch = str.match(/\d+/);
      return { 
        attiva: true, 
        tipo: 'chiusa', 
        numero: numeroMatch ? numeroMatch[0] : undefined 
      };
    }

    return null;
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
        // Phase F — sia i campi tradizionali che i nuovi mobile_/energy_ contano come "ho una pratica"
        if (
          value &&
          (
            ['type', 'offerName', 'offerCode', 'pacchettiAggiuntivi', 'prodotti', 'wash', 'appointmentData', 'iban', 'convergenza', 'lavorazioniPostAttivazione'].includes(col.target) ||
            col.target.startsWith('mobile_') ||
            col.target.startsWith('energy_')
          )
        ) {
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

    // 🔥 FIX: Validazione CF con pulizia aggressiva E LOGGING COMPLETO
    console.log('[CF DEBUG] ==========================================');
    console.log('[CF DEBUG] Cliente:', customerData.firstName, customerData.lastName);
    console.log('[CF DEBUG] CF dal mapping (raw):', JSON.stringify(customerData.fiscalCode));
    console.log('[CF DEBUG] Tipo CF:', typeof customerData.fiscalCode);

    if (customerData.fiscalCode) {
      // 🔥 FIX: Se Excel ha convertito in numero (notazione scientifica), recupera formato corretto
      let originalCF = customerData.fiscalCode;
      
      if (typeof originalCF === 'number') {
        // Per i numeri, usa BigInt per evitare notazione scientifica
        try {
          originalCF = BigInt(originalCF).toString().padStart(16, '0');
          console.log('[CF DEBUG] CF era numero, convertito a:', originalCF);
        } catch (e) {
          originalCF = String(originalCF);
          console.log('[CF DEBUG] CF numero fallback a stringa:', originalCF);
        }
      } else {
        originalCF = String(originalCF);
      }
      
      // Pulizia aggressiva: rimuovi TUTTO tranne lettere e numeri
      const cleanedCF = originalCF
        .replace(/[^a-zA-Z0-9]/g, '')  // Rimuovi TUTTO tranne lettere e numeri
        .toUpperCase()
        .trim();

      console.log('[CF DEBUG] Originale:', JSON.stringify(originalCF));
      console.log('[CF DEBUG] Pulito:', cleanedCF, '- Lunghezza:', cleanedCF.length);

      // Se dopo la pulizia è vuoto o ha meno di 16 caratteri
      if (cleanedCF.length === 0) {
        console.log('[CF DEBUG] ⚠️ CF VUOTO dopo pulizia - Contenuto originale:', JSON.stringify(customerData.fiscalCode));
        warnings.push(`CF presente ma illeggibile (caratteri speciali/spazi): "${customerData.fiscalCode}". Verificare cella Excel.`);
        // 🔥 Salviamo il CF raw nei metadati per poterlo recuperare/debuggare
        customerData.fiscalCodeRaw = customerData.fiscalCode;
        delete customerData.fiscalCode; // Rimuoviamo il CF pulito (vuoto)
      } else if (cleanedCF.length !== 16) {
        console.log('[CF DEBUG] ⚠️ CF lunghezza errata:', cleanedCF.length, 'caratteri');
        warnings.push(`CF lunghezza errata (${cleanedCF.length} caratteri invece di 16): ${cleanedCF}`);
        customerData.fiscalCode = cleanedCF; // Salva comunque per debug
      } else {
        // CF formalmente valido (16 caratteri), controlla pattern
        customerData.fiscalCode = cleanedCF;
        const cfValidation = CommonValidators.fiscalCode(cleanedCF);
        if (!cfValidation.valid) {
          console.log('[CF DEBUG] ⚠️ CF pattern non valido:', cleanedCF, '- Errore:', cfValidation.error);
          warnings.push(`CF non valido: ${cfValidation.error} - Valore: ${cleanedCF}`);
        } else {
          console.log('[CF DEBUG] ✅ CF valido:', cleanedCF);
        }
      }
    } else {
      console.log('[CF DEBUG] ❌ CF mancante per cliente:', customerData.firstName, customerData.lastName);
    }
    console.log('[CF DEBUG] ==========================================');

    if (customerData.email) {
      const emailValidation = CommonValidators.email(customerData.email);
      if (!emailValidation.valid) errors.push(`Email non valida: ${emailValidation.error}`);
    }

    if (customerData.phonePrimary) {
      const phoneValidation = CommonValidators.phone(customerData.phonePrimary);
      if (!phoneValidation.valid) warnings.push(`Telefono non valido: ${phoneValidation.error}`);
    }

    if (hasPractice) {
      // Phase F — se forceCategory è MOBILE o ENERGY, il "type" è opzionale
      // (il bundle è in mobileData / energyData, non nei campi tradizionali)
      const isAltCategory =
        mapping.forceCategory === 'MOBILE' || mapping.forceCategory === 'ENERGY';

      if (!practiceType && !isAltCategory) {
        errors.push('Impossibile rilevare il tipo pratica. Mappa il campo "Tipo" o usa "Forza tipo" nelle impostazioni');
      } else if (practiceType) {
        const validTypes = ['TIM_FIBRA', 'VODAFONE', 'WINDTRE', 'ILIAD', 'OPTIMA', 'IREN', 'SKY', 'FASTWEB', 'TISCALI', 'LINKEM', 'PLENITUDE', 'ENEL', 'POSTEMOBILE', 'COOPVOCE'];
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
    importJobId?: string
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
        queryRunner,
        importJobId
      );

      let practice: Practice | undefined;
      
      if (hasPractice && practiceData) {
        practice = await this.createPractice(
          practiceData, 
          customerResult.customer.id, 
          tenantId, 
          userId,
          queryRunner,
          importJobId,
          mapping.forceCategory, // Phase F — propaga forceCategory dalla MappingStep
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
    importJobId?: string
  ): Promise<{ customer: Customer; isNew: boolean; matchedBy: string }> {
    
    // 🔥 FIX: Pulizia CF da spazi
    const normalizedCF = data.fiscalCode?.toString().trim().toUpperCase().replace(/\s/g, '') || '';
    const normalizedEmail = data.email?.toString().trim().toLowerCase() || '';
    const normalizedPhone = data.phonePrimary 
      ? String(data.phonePrimary).replace(/\D/g, '') 
      : '';

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
        if (data.phonePrimary && data.phonePrimary !== '0000000000') {
          existing.phonePrimary = String(data.phonePrimary).replace(/\D/g, '');
        }
        if (data.phoneSecondary) {
          existing.phoneSecondary = String(data.phoneSecondary).replace(/\D/g, '');
        }
        
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
      email: data.email || null,
      phonePrimary: data.phonePrimary,
      phoneSecondary: data.phoneSecondary ? String(data.phoneSecondary).replace(/\D/g, '') : null,
      address: data.address || {},
      status: 'active',
      sourceImportJobId: importJobId,
      importMetadata: {
        wash: data.wash,
        phonePlaceholder: data.phonePrimary === '0000000000',
        rawDataSnapshot: data,
        importedAt: new Date().toISOString()
      } as any
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
    importJobId?: string,
    forceCategory?: 'FIXED_LINE' | 'MOBILE' | 'ENERGY' | 'SKY',
  ): Promise<Practice> {
    
    // 🔥 FIX: Gestione WASH intelligente
    const washConfig = this.parseWashConfig(data.wash);
    
    // 🔥 NUOVO: Gestione Convergenza
    const convergenza = this.parseConvergenza(data.convergenza);
    
    // Calcolo stato globale
    let statoGlobale: 'completo' | 'non_completo' | null = null;
    if (convergenza?.attiva) {
      if (convergenza.tipo === 'chiusa' && convergenza.numero) {
        statoGlobale = 'completo';
      } else {
        statoGlobale = 'non_completo';
      }
    }

    // 🔥 FIX: Gestione appuntamento (senza controlli rigidi)
    let appointmentData = null;
    if (data.appointmentData) {
      // Se è già un oggetto, usalo; se è stringa, wrappa
      if (typeof data.appointmentData === 'object') {
        appointmentData = data.appointmentData;
      } else {
        appointmentData = { raw: String(data.appointmentData) };
      }
    }

    // Phase F — bundle mobileData / energyData dai campi mobile_* / energy_*
    const category: 'FIXED_LINE' | 'MOBILE' | 'ENERGY' | 'SKY' = forceCategory || 'FIXED_LINE';

    const mobileData =
      category === 'MOBILE'
        ? this.bundleMobileData(data)
        : null;

    const energyData =
      category === 'ENERGY'
        ? this.bundleEnergyData(data)
        : null;

    console.log('[CREATE PRACTICE] importJobId ricevuto:', importJobId, 'category:', category);
    const practiceData: any = {
      tenantId,
      customerId,
      createdBy: userId,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      type: data.type?.toUpperCase() as PracticeType,
      category,
      status: importJobId ? 'completed' : (data.status || 'draft'),
      operationalStatus: CommonValidators.normalizeStatus(data.operationalStatus, 'OPERATIONAL'),
      // 🔥 NUOVI CAMPI
      convergenza: convergenza,
      statoGlobale: statoGlobale,
      lavorazioniPostAttivazione: data.lavorazioniPostAttivazione || null,
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
      sourceImportJobId: importJobId,
      soldBy: data.soldBy,
      enteredBy: data.enteredBy,
      oldLineData: {
        ...(data.oldLineNumber && { phoneNumber: data.oldLineNumber }),
        ...(data.migrationCode && { migrationCode: data.migrationCode }),
      },
      paymentMethod: data.iban ? { iban: data.iban, postePay: null, bollettino: false } : {},
      // 🔥 FIX: WASH config
      washConfig: washConfig || undefined,
      // 🔥 FIX: Appointment data
      appointmentData: appointmentData,
      // Phase F — payload jsonb specifici per categoria
      mobileData,
      energyData,
      importMetadata: {
        originalRowNumber: data._rowNumber,
        rawDataSnapshot: data,
        validationOverrides: []
      }
    };

    // Gestione campi extra nelle note
    const extraFields: string[] = [];
    if (data.pacchettiAggiuntivi) extraFields.push(`Pacchetti: ${data.pacchettiAggiuntivi}`);
    if (data.prodotti) extraFields.push(`Prodotti: ${data.prodotti}`);
    if (data.wash && !washConfig?.enabled) extraFields.push(`Wash: ${data.wash}`);
    if (data.lavorazioniPostAttivazione) extraFields.push(`Lavorazioni: ${data.lavorazioniPostAttivazione}`);
    
    if (extraFields.length > 0) {
      practiceData.offerNote = practiceData.offerNote 
        ? `${practiceData.offerNote} | ${extraFields.join(' | ')}`
        : extraFields.join(' | ');
    }

    const practice = queryRunner.manager.create(Practice, practiceData);
    return await queryRunner.manager.save(practice);
  }

  /**
   * Phase F — Helper: estrae i campi `mobile_*` dal data flat e li bundla
   * dentro l'oggetto jsonb mobileData con i nomi corretti dell'entity.
   */
  private bundleMobileData(data: any): any {
    const out: any = {};
    if (data.mobile_tipoLinea) out.tipoLinea = String(data.mobile_tipoLinea).toUpperCase();
    if (data.mobile_numeroDaPortare) out.numeroDaPortare = String(data.mobile_numeroDaPortare).replace(/\D/g, '');
    if (data.mobile_codiceFiscaleVecchiaLinea) out.codiceFiscaleVecchiaLinea = String(data.mobile_codiceFiscaleVecchiaLinea).toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (data.mobile_gestoreProvenienza) out.gestoreProvenienza = String(data.mobile_gestoreProvenienza);
    if (data.mobile_gestoreNuovaLinea) out.gestoreNuovaLinea = String(data.mobile_gestoreNuovaLinea);
    if (data.mobile_ricarica) out.ricarica = String(data.mobile_ricarica).toUpperCase();
    if (data.mobile_timUnica) out.timUnica = String(data.mobile_timUnica).toUpperCase();
    if (data.mobile_numeroReteFissaTimUnica) out.numeroReteFissaTimUnica = String(data.mobile_numeroReteFissaTimUnica).replace(/\D/g, '');
    if (data.mobile_ibanCdc) out.ibanCdc = String(data.mobile_ibanCdc).toUpperCase().replace(/\s/g, '');
    if (data.mobile_noteMnp) out.noteMnp = String(data.mobile_noteMnp);
    if (data.mobile_noteMetodoPagamento) out.noteMetodoPagamento = String(data.mobile_noteMetodoPagamento);
    if (data.mobile_noteGeneriche) out.noteGeneriche = String(data.mobile_noteGeneriche);
    if (data.mobile_accordiCliente) out.accordiCliente = String(data.mobile_accordiCliente);
    return Object.keys(out).length > 0 ? out : null;
  }

  /**
   * Phase F — Helper: estrae i campi `energy_*` dal data flat e li bundla
   * dentro l'oggetto jsonb energyData con i nomi corretti dell'entity.
   */
  private bundleEnergyData(data: any): any {
    const out: any = {};
    if (data.energy_tipoAttivazione) out.tipoAttivazione = String(data.energy_tipoAttivazione).toUpperCase();
    if (data.energy_codiceFiscaleVecchioContratto) out.codiceFiscaleVecchioContratto = String(data.energy_codiceFiscaleVecchioContratto).toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (data.energy_numeroContatore) out.numeroContatore = String(data.energy_numeroContatore);
    if (data.energy_potenzaContatore) out.potenzaContatore = String(data.energy_potenzaContatore).toUpperCase();
    if (data.energy_gestoreProvenienza) out.gestoreProvenienza = String(data.energy_gestoreProvenienza);
    if (data.energy_gestoreNuovoContratto) out.gestoreNuovoContratto = String(data.energy_gestoreNuovoContratto);
    if (data.energy_tipoOfferta) out.tipoOfferta = String(data.energy_tipoOfferta).toUpperCase();
    // Campo libero "Offerta" (può essere numero come "0,4" o parola come "fissa"/"variabile")
    if (data.energy_offerta !== undefined && data.energy_offerta !== null && String(data.energy_offerta).trim() !== '') {
      out.offerta = String(data.energy_offerta).trim();
    }
    if (data.energy_ibanCdc) out.ibanCdc = String(data.energy_ibanCdc).toUpperCase().replace(/\s/g, '');
    if (data.energy_noteMetodoPagamento) out.noteMetodoPagamento = String(data.energy_noteMetodoPagamento);
    if (data.energy_noteGeneriche) out.noteGeneriche = String(data.energy_noteGeneriche);
    if (data.energy_accordiCliente) out.accordiCliente = String(data.energy_accordiCliente);
    return Object.keys(out).length > 0 ? out : null;
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
        // 🔥 FIX: Rimuove anche spazi dal CF
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
      'status', 'notes', 'assignedTo'
      // NOTA: 'wash' è un campo pratica, non cliente!
    ];
    return fields.includes(target);
  }

  private isPracticeField(target: string): boolean {
    const fields = [
      'type', 'offerCode', 'offerName', 'offerCanone', 'offerAttivazione', 
      'offerVincolo', 'offerNote', 'offerDisattivazione', 'offerType', 
      'offerScadenza', 'status', 'operationalStatus', 'lineType', 
      'technology', 'notes', 'installationAddress', 'soldBy', 'enteredBy', 
      'migrationCode', 'iban', 'oldLineNumber', 
      'pacchettiAggiuntivi', 'prodotti', 'wash', 'appointmentData',
      'convergenza', 'lavorazioniPostAttivazione', 'statoGlobale',
      // Phase F — campi mobile (prefix `mobile_`)
      'mobile_tipoLinea', 'mobile_numeroDaPortare', 'mobile_codiceFiscaleVecchiaLinea',
      'mobile_gestoreProvenienza', 'mobile_gestoreNuovaLinea', 'mobile_ricarica',
      'mobile_timUnica', 'mobile_numeroReteFissaTimUnica', 'mobile_ibanCdc',
      'mobile_noteMnp', 'mobile_noteMetodoPagamento', 'mobile_noteGeneriche',
      'mobile_accordiCliente',
      // Phase F — campi energy (prefix `energy_`)
      'energy_tipoAttivazione', 'energy_codiceFiscaleVecchioContratto',
      'energy_numeroContatore', 'energy_potenzaContatore',
      'energy_gestoreProvenienza', 'energy_gestoreNuovoContratto',
      'energy_tipoOfferta', 'energy_offerta', 'energy_ibanCdc',
      'energy_noteMetodoPagamento', 'energy_noteGeneriche', 'energy_accordiCliente',
    ];
    return fields.includes(target);
  }

  getTargetFields(): Array<{ name: string; label: string; type: string; required: boolean; category: 'customer' | 'practice'; helpText?: string }> {
    const customerFields = [
      { name: 'address', label: 'Indirizzo (JSON)', type: 'string', required: false, category: 'customer' as const },
      { name: 'customerSegment', label: 'Segmento Cliente', type: 'string', required: false, category: 'customer' as const },
      { name: 'email', label: 'Email', type: 'string', required: false, category: 'customer' as const, helpText: 'Identificatore secondario' },
      { name: 'fiscalCode', label: 'Codice Fiscale', type: 'string', required: false, category: 'customer' as const, helpText: 'Identificatore principale (tollera spazi)' },
      { name: 'firstName', label: 'Nome', type: 'string', required: true, category: 'customer' as const },
      { name: 'lastName', label: 'Cognome', type: 'string', required: true, category: 'customer' as const },
      { name: 'mobile', label: 'Cellulare (fallback)', type: 'string', required: false, category: 'customer' as const, helpText: 'Usato come phonePrimary se vuoto' },
      { name: 'notes', label: 'Note Cliente', type: 'text', required: false, category: 'customer' as const },
      { name: 'phone', label: 'Telefono (fallback)', type: 'string', required: false, category: 'customer' as const, helpText: 'Alias per phonePrimary' },
      { name: 'phonePrimary', label: 'Telefono Primario', type: 'string', required: false, category: 'customer' as const, helpText: 'Obbligatorio in DB, ma fallback disponibile' },
      { name: 'phoneSecondary', label: 'Telefono Secondario', type: 'string', required: false, category: 'customer' as const },
      { name: 'vatNumber', label: 'Partita IVA', type: 'string', required: false, category: 'customer' as const },
      { name: 'wash', label: 'Wash Config', type: 'string', required: false, category: 'practice' as const, helpText: 'Valori: SI, WASH, NO WASH, NO' },
    ];

    const practiceFields = [
      { name: 'appointmentData', label: 'Dati Appuntamento', type: 'json', required: false, category: 'practice' as const, helpText: 'Data, ora e note installazione' },
      { name: 'convergenza', label: 'Convergenza', type: 'json', required: false, category: 'practice' as const, helpText: 'Formato: {"attiva": true, "tipo": "daChiudere"|"chiusa", "numero": "123"}' },
      { name: 'createdAt', label: 'Data Inserimento Pratica', type: 'date', required: false, category: 'practice' as const, helpText: 'Formato: GG/MM/AAAA' },
      { name: 'enteredBy', label: 'Inserito Da', type: 'string', required: false, category: 'practice' as const },
      { name: 'iban', label: 'IBAN', type: 'string', required: false, category: 'practice' as const },
      { name: 'lavorazioniPostAttivazione', label: 'Lavorazioni Post Attivazione', type: 'text', required: false, category: 'practice' as const },
      { name: 'lineType', label: 'Tipo Linea', type: 'string', required: false, category: 'practice' as const },
      { name: 'migrationCode', label: 'Codice Migrazione', type: 'string', required: false, category: 'practice' as const },
      { name: 'notes', label: 'Note Pratica', type: 'text', required: false, category: 'practice' as const },
      { name: 'offerAttivazione', label: 'Costo Attivazione', type: 'string', required: false, category: 'practice' as const },
      { name: 'offerCanone', label: 'Canone €', type: 'string', required: false, category: 'practice' as const },
      { name: 'offerCode', label: 'Codice Offerta', type: 'string', required: false, category: 'practice' as const },
      { name: 'offerName', label: 'Nome Offerta', type: 'string', required: false, category: 'practice' as const, helpText: 'Usato per auto-rilevare il gestore' },
      { name: 'offerNote', label: 'Note Offerta', type: 'string', required: false, category: 'practice' as const },
      { name: 'offerVincolo', label: 'Vincolo (mesi)', type: 'string', required: false, category: 'practice' as const },
      { name: 'operationalStatus', label: 'Stato Operativo', type: 'enum', required: false, category: 'practice' as const },
      { name: 'pacchettiAggiuntivi', label: 'Pacchetti Aggiuntivi', type: 'string', required: false, category: 'practice' as const, helpText: 'Servizi extra (Netflix, Sky Sport, etc.)' },
      { name: 'prodotti', label: 'Prodotti', type: 'string', required: false, category: 'practice' as const, helpText: 'Prodotti associati alla pratica' },
      { name: 'oldLineNumber', label: 'Numero Vecchia Linea', type: 'string', required: false, category: 'practice' as const },
      { name: 'soldBy', label: 'Venduto Da', type: 'string', required: false, category: 'practice' as const },
      { name: 'statoGlobale', label: 'Stato Globale', type: 'enum', required: false, category: 'practice' as const, helpText: 'completo o non_completo' },
      { name: 'status', label: 'Stato Pratica', type: 'enum', required: false, category: 'practice' as const },
      { name: 'technology', label: 'Tecnologia', type: 'string', required: false, category: 'practice' as const },
      { name: 'type', label: 'Tipo Pratica', type: 'enum', required: false, category: 'practice' as const, helpText: 'Auto-rilevato da Nome Offerta se non mappato' },
      { name: 'wash', label: 'Wash Config', type: 'string', required: false, category: 'practice' as const, helpText: 'SI/WASH = wash attiva, NO/NO WASH = wash disattiva' },
    ];

    const sortByLabel = (a: any, b: any) => a.label.localeCompare(b.label, 'it');

    // Phase F — campi specifici Mobile (visibili quando categoria=MOBILE)
    const mobileFields = [
      { name: 'mobile_tipoLinea', label: '[Mobile] Tipo linea (MNP / DOPPIA_MNP / NUOVO_NUMERO)', type: 'enum', required: false, category: 'practice' as const },
      { name: 'mobile_numeroDaPortare', label: '[Mobile] Numero da portare', type: 'string', required: false, category: 'practice' as const },
      { name: 'mobile_codiceFiscaleVecchiaLinea', label: '[Mobile] CF intestatario vecchia linea', type: 'string', required: false, category: 'practice' as const },
      { name: 'mobile_gestoreProvenienza', label: '[Mobile] Gestore di provenienza', type: 'string', required: false, category: 'practice' as const },
      { name: 'mobile_gestoreNuovaLinea', label: '[Mobile] Gestore nuova linea', type: 'string', required: false, category: 'practice' as const },
      { name: 'mobile_ricarica', label: '[Mobile] Ricarica (DA_FARE / DA_NON_FARE / ALTRO)', type: 'enum', required: false, category: 'practice' as const },
      { name: 'mobile_timUnica', label: '[Mobile] TIM Unica (AGGANCIATA / DA_AGGANCIARE / NON_AGGANCIARE)', type: 'enum', required: false, category: 'practice' as const },
      { name: 'mobile_numeroReteFissaTimUnica', label: '[Mobile] Numero rete fissa TIM Unica', type: 'string', required: false, category: 'practice' as const },
      { name: 'mobile_ibanCdc', label: '[Mobile] IBAN / Carta di credito', type: 'string', required: false, category: 'practice' as const },
      { name: 'mobile_noteMnp', label: '[Mobile] Note MNP', type: 'text', required: false, category: 'practice' as const },
      { name: 'mobile_noteMetodoPagamento', label: '[Mobile] Note metodo pagamento', type: 'text', required: false, category: 'practice' as const },
      { name: 'mobile_noteGeneriche', label: '[Mobile] Note generiche', type: 'text', required: false, category: 'practice' as const },
      { name: 'mobile_accordiCliente', label: '[Mobile] Accordi cliente', type: 'text', required: false, category: 'practice' as const },
    ];

    // Phase F — campi specifici Energy (visibili quando categoria=ENERGY)
    const energyFields = [
      { name: 'energy_tipoAttivazione', label: '[Energy] Tipo attivazione (LUCE_SWITCH / GAS_SWITCH / ...)', type: 'enum', required: false, category: 'practice' as const },
      { name: 'energy_codiceFiscaleVecchioContratto', label: '[Energy] CF intestatario vecchio contratto', type: 'string', required: false, category: 'practice' as const },
      { name: 'energy_numeroContatore', label: '[Energy] Numero contatore', type: 'string', required: false, category: 'practice' as const },
      { name: 'energy_potenzaContatore', label: '[Energy] Potenza contatore (1.5_KW / 3_KW / 4.5_KW / 6_KW / GAS)', type: 'enum', required: false, category: 'practice' as const },
      { name: 'energy_gestoreProvenienza', label: '[Energy] Gestore di provenienza', type: 'string', required: false, category: 'practice' as const },
      { name: 'energy_gestoreNuovoContratto', label: '[Energy] Gestore nuovo contratto', type: 'string', required: false, category: 'practice' as const },
      { name: 'energy_tipoOfferta', label: '[Energy] Tipo offerta (VARIABILE / FISSA / ALTRO)', type: 'enum', required: false, category: 'practice' as const },
      { name: 'energy_offerta', label: '[Energy] Offerta (valore libero, es. "0,4" o "fissa"/"variabile")', type: 'string', required: false, category: 'practice' as const, helpText: 'Diverso da Nome Offerta: qui va il valore tariffario o il tipo (numero o parola)' },
      { name: 'energy_ibanCdc', label: '[Energy] IBAN / Carta di credito', type: 'string', required: false, category: 'practice' as const },
      { name: 'energy_noteMetodoPagamento', label: '[Energy] Note metodo pagamento', type: 'text', required: false, category: 'practice' as const },
      { name: 'energy_noteGeneriche', label: '[Energy] Note generiche', type: 'text', required: false, category: 'practice' as const },
      { name: 'energy_accordiCliente', label: '[Energy] Accordi cliente', type: 'text', required: false, category: 'practice' as const },
    ];

    return [
      ...customerFields.sort(sortByLabel),
      ...practiceFields.sort(sortByLabel),
      ...mobileFields.sort(sortByLabel),
      ...energyFields.sort(sortByLabel),
    ];
  }
}