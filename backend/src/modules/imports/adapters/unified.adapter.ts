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
      
      // ✅ NUOVI CAMPI AGGIUNTI
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

  // Resto del file...
  // (validateRow, createPractice, applyTransformer, etc)

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
      
      // ✅ AGGIUNTO: Transformer per date italiane
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
}