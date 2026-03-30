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
}