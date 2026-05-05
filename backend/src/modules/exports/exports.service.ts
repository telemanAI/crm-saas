import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Practice } from '../practices/entities/practice.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { Offer } from '../offers/entities/offer.entity';
import { PiecesReportService } from '../reports/pieces-report.service';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import PDFDocument from 'pdfkit';

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
    @InjectRepository(Tenant)
    private tenantRepo: Repository<Tenant>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private readonly piecesService: PiecesReportService,
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

  // ========== REPORT PDF MENSILE PEZZI ==========
  async generateMonthlyReportPDF(params: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    month?: string;
  }): Promise<string> {
    const { tenantId, userId, companyId } = params;
    const month = params.month || this.currentMonth();
    const [year, mon] = month.split('-').map(Number);
    const from = `${month}-01`;
    const to = `${month}-${this.lastDayOfMonth(year, mon)}`;

    const report = await this.piecesService.getPieces({
      scope: companyId ? 'company' : 'shop',
      tenantId,
      companyId: companyId || null,
      from,
      to,
    });

    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const user = await this.userRepo.findOne({ where: { id: userId } });

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const exportsDir = path.join(process.cwd(), 'uploads', 'exports');
    if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });
    const fileName = `report-pezzi-${month}-${Date.now()}.pdf`;
    const filePath = path.join(exportsDir, fileName);
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc.fontSize(20).font('Helvetica-Bold');
    doc.text('Report Mensile — Pezzi Venduti', 40, 40);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Generato il: ${new Date().toLocaleDateString('it-IT')}`, 40, 70);
    doc.text(`Periodo: ${this.monthLabel(month)}`, 40, 85);
    doc.text(`Shop/Company: ${tenant?.name || 'N/D'}`, 40, 100);
    doc.text(`Generato da: ${[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'N/D'}`, 40, 115);
    doc.moveTo(40, 135).lineTo(555, 135).stroke('#cccccc');

    let y = 155;

    // Riepilogo
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text('Riepilogo', 40, y);
    y += 25;
    doc.fontSize(11).font('Helvetica');
    doc.text(`Totale pezzi venduti: ${report.grandTotal}`, 40, y);
    y += 18;

    const catMap = new Map<string, number>();
    const provMap = new Map<string, number>();
    for (const row of report.rows) {
      for (const [key, count] of Object.entries(row.breakdown)) {
        const [cat, prov] = key.split('|');
        catMap.set(cat, (catMap.get(cat) || 0) + (count as number));
        provMap.set(prov, (provMap.get(prov) || 0) + (count as number));
      }
    }

    if (catMap.size > 0) {
      doc.font('Helvetica-Bold').text('Per categoria:', 40, y);
      y += 16;
      doc.font('Helvetica');
      for (const [cat, count] of catMap) {
        doc.text(`  • ${this.catLabel(cat)}: ${count}`, 40, y);
        y += 14;
      }
      y += 4;
    }

    if (provMap.size > 0) {
      doc.font('Helvetica-Bold').text('Per provider:', 40, y);
      y += 16;
      doc.font('Helvetica');
      for (const [prov, count] of provMap) {
        doc.text(`  • ${prov}: ${count}`, 40, y);
        y += 14;
      }
      y += 8;
    }

    // Classifica operatori
    if (report.rows.length > 0) {
      y += 10;
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text('Classifica Operatori', 40, y);
      y += 25;
      this.drawTableRow(doc, 40, y, ['Pos', 'Operatore', 'Pezzi'], [40, 300, 80], true);
      y += 20;
      doc.font('Helvetica').fontSize(10);
      for (let i = 0; i < report.rows.length; i++) {
        const row = report.rows[i];
        if (y > 750) { doc.addPage(); y = 40; }
        this.drawTableRow(doc, 40, y, [`${i + 1}`, row.userName, String(row.total)], [40, 300, 80], false, i % 2 === 1);
        y += 18;
      }
    }

    doc.end();
    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  private drawTableRow(doc: any, x: number, y: number, cells: string[], widths: number[], isHeader: boolean, altBg = false) {
    const rowHeight = 18;
    if (altBg) { doc.save(); doc.fillColor('#f5f5f5').rect(x, y - 2, 515, rowHeight).fill(); doc.restore(); }
    if (isHeader) { doc.save(); doc.fillColor('#e0e0e0').rect(x, y - 2, 515, rowHeight).fill(); doc.restore(); doc.font('Helvetica-Bold').fontSize(10); }
    let cx = x;
    for (let i = 0; i < cells.length; i++) {
      doc.fillColor('#333333').text(cells[i], cx + 4, y + 2, { width: widths[i] - 8, ellipsis: true });
      cx += widths[i];
    }
    doc.moveTo(x, y + rowHeight - 2).lineTo(x + 515, y + rowHeight - 2).stroke('#dddddd');
  }

  private currentMonth(): string { return new Date().toISOString().slice(0, 7); }
  private lastDayOfMonth(y: number, m: number): string { return String(new Date(y, m, 0).getDate()).padStart(2, '0'); }
  private monthLabel(ym: string): string { const [y, m] = ym.split('-').map(Number); const months = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']; return `${months[m - 1]} ${y}`; }
  private catLabel(cat: string): string { const map: Record<string, string> = { FIXED_LINE: 'Linea Fissa', MOBILE: 'Mobile', ENERGY: 'Energia', INSURANCE: 'Assicurazione', FINANCE: 'Finanza', CUSTOM: 'Custom' }; return map[cat] || cat; }
}