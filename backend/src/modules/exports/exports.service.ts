import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Practice } from '../practices/entities/practice.entity';
import { Customer } from '../customers/entities/customer.entity';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

export interface ExportFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: string[];
  type?: string[];
}

@Injectable()
export class ExportsService {
  constructor(
    @InjectRepository(Practice)
    private practiceRepository: Repository<Practice>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
  ) {}

  async exportPractices(
    filters: ExportFilters,
    tenantId: string,
    format: 'xlsx' | 'csv' = 'xlsx',
  ): Promise<string> {
    // Costruisci query
    const where: any = { tenantId };

    if (filters.status && filters.status.length > 0) {
      where.status = filters.status;
    }

    if (filters.type && filters.type.length > 0) {
      where.type = filters.type;
    }

    if (filters.dateFrom && filters.dateTo) {
      where.createdAt = Between(new Date(filters.dateFrom), new Date(filters.dateTo));
    }

    // Carica pratiche con clienti
    const practices = await this.practiceRepository.find({
      where,
      relations: ['customer'],
      order: { createdAt: 'DESC' },
    });

    // Prepara dati per Excel
    const data = practices.map(p => ({
      'ID Pratica': p.id,
      'Data Creazione': p.createdAt.toLocaleDateString('it-IT'),
      'Tipo': p.type,
      'Cliente': p.customer ? `${p.customer.firstName} ${p.customer.lastName}` : '',
      'Codice Fiscale': p.customer?.fiscalCode || '',
      'Telefono': p.customer?.phonePrimary || '',
      'Email': p.customer?.email || '',
      'Offerta': p.offerName || '',
      'Canone': p.offerCanone || '',
      'Tecnologia': p.technology || '',
      'Tipo Linea': p.lineType || '',
      'Stato': p.status,
      'Stato Operativo': p.operationalStatus,
      'Note': p.notes || '',
    }));

    // Crea workbook
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pratiche');

    // Salva file
    const exportsDir = path.join(process.cwd(), 'uploads', 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const fileName = `export_pratiche_${Date.now()}.${format}`;
    const filePath = path.join(exportsDir, fileName);

    if (format === 'xlsx') {
      XLSX.writeFile(workbook, filePath);
    } else {
      XLSX.writeFile(workbook, filePath, { bookType: 'csv' });
    }

    return filePath;
  }

  async exportCustomers(tenantId: string, format: 'xlsx' | 'csv' = 'xlsx'): Promise<string> {
    const customers = await this.customerRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });

    const data = customers.map(c => ({
      'ID': c.id,
      'Nome': c.firstName,
      'Cognome': c.lastName,
      'Codice Fiscale': c.fiscalCode || '',
      'Partita IVA': c.vatNumber || '',
      'Telefono Principale': c.phonePrimary,
      'Telefono Secondario': c.phoneSecondary || '',
      'Email': c.email || '',
      'Indirizzo': c.address ? JSON.stringify(c.address) : '',
      'Stato': c.status,
      'Data Creazione': c.createdAt.toLocaleDateString('it-IT'),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clienti');

    const exportsDir = path.join(process.cwd(), 'uploads', 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const fileName = `export_clienti_${Date.now()}.${format}`;
    const filePath = path.join(exportsDir, fileName);

    if (format === 'xlsx') {
      XLSX.writeFile(workbook, filePath);
    } else {
      XLSX.writeFile(workbook, filePath, { bookType: 'csv' });
    }

    return filePath;
  }

  /**
   * Phase F — Export multi-sheet: un workbook xlsx con un foglio per categoria
   *  - Linea Fissa (FIXED_LINE)
   *  - Mobile (MOBILE) con campi mobile_*
   *  - Luce/Gas (ENERGY) con campi energy_*
   *  - SKY
   *  - Clienti (foglio sintetico)
   * Filtri opzionali su date range.
   */
  async exportPracticesMultiSheet(
    filters: ExportFilters,
    tenantId: string,
  ): Promise<string> {
    const where: any = { tenantId };
    if (filters.dateFrom && filters.dateTo) {
      where.createdAt = Between(new Date(filters.dateFrom), new Date(filters.dateTo));
    }

    const practices = await this.practiceRepository.find({
      where,
      relations: ['customer'],
      order: { createdAt: 'DESC' },
    });

    const baseRow = (p: Practice) => ({
      'ID Pratica': p.id,
      'Data Creazione': p.createdAt.toLocaleDateString('it-IT'),
      'Tipo': p.type,
      'Cliente': p.customer ? `${p.customer.firstName} ${p.customer.lastName}` : '',
      'Codice Fiscale': p.customer?.fiscalCode || '',
      'Telefono': p.customer?.phonePrimary || '',
      'Email': p.customer?.email || '',
      'Offerta': p.offerName || '',
      'Canone': p.offerCanone || '',
      'Stato': p.status,
      'Stato Operativo': p.operationalStatus,
      'Note': p.notes || '',
    });

    const fixedLineRows = practices
      .filter((p: any) => !p.category || p.category === 'FIXED_LINE')
      .map((p) => ({
        ...baseRow(p),
        'Tecnologia': p.technology || '',
        'Tipo Linea': p.lineType || '',
      }));

    const mobileRows = practices
      .filter((p: any) => p.category === 'MOBILE')
      .map((p: any) => ({
        ...baseRow(p),
        'Tipo linea (MNP/Nuovo)': p.mobileData?.tipoLinea || '',
        'Numero da portare': p.mobileData?.numeroDaPortare || '',
        'Gestore di provenienza': p.mobileData?.gestoreProvenienza || '',
        'Gestore nuova linea': p.mobileData?.gestoreNuovaLinea || '',
        'Ricarica': p.mobileData?.ricarica || '',
        'TIM Unica': p.mobileData?.timUnica || '',
        'Numero rete fissa TIM Unica': p.mobileData?.numeroReteFissaTimUnica || '',
        'IBAN': p.mobileData?.ibanCdc || '',
        'Note MNP': p.mobileData?.noteMnp || '',
      }));

    const energyRows = practices
      .filter((p: any) => p.category === 'ENERGY')
      .map((p: any) => ({
        ...baseRow(p),
        'Tipo attivazione': p.energyData?.tipoAttivazione || '',
        'Numero contatore': p.energyData?.numeroContatore || '',
        'Potenza contatore': p.energyData?.potenzaContatore || '',
        'Gestore provenienza': p.energyData?.gestoreProvenienza || '',
        'Gestore nuovo contratto': p.energyData?.gestoreNuovoContratto || '',
        'Tipo offerta': p.energyData?.tipoOfferta || '',
        'IBAN': p.energyData?.ibanCdc || '',
      }));

    const skyRows = practices
      .filter((p: any) => p.category === 'SKY')
      .map((p) => ({
        ...baseRow(p),
        'Stato Sky TV': (p as any).skyTvStatus || '',
      }));

    const customers = await this.customerRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: 5000, // safety
    });
    const customerRows = customers.map((c) => ({
      'ID': c.id,
      'Nome': c.firstName,
      'Cognome': c.lastName,
      'Codice Fiscale': c.fiscalCode || '',
      'Telefono': c.phonePrimary,
      'Email': c.email || '',
    }));

    const workbook = XLSX.utils.book_new();
    if (fixedLineRows.length) {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(fixedLineRows), 'Linea Fissa');
    }
    if (mobileRows.length) {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(mobileRows), 'Mobile');
    }
    if (energyRows.length) {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(energyRows), 'Luce-Gas');
    }
    if (skyRows.length) {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(skyRows), 'SKY');
    }
    if (customerRows.length) {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(customerRows), 'Clienti');
    }
    if (
      !fixedLineRows.length && !mobileRows.length && !energyRows.length && !skyRows.length
    ) {
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet([{ Avviso: 'Nessuna pratica nel range selezionato.' }]),
        'Vuoto',
      );
    }

    const exportsDir = path.join(process.cwd(), 'uploads', 'exports');
    if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });

    const fileName = `export_pratiche_multi_${Date.now()}.xlsx`;
    const filePath = path.join(exportsDir, fileName);
    XLSX.writeFile(workbook, filePath);
    return filePath;
  }
}