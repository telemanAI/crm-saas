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
    from?: string;
    to?: string;
    statuses?: string;
    category?: string;
    provider?: string;
  }): Promise<string> {
    const { tenantId, userId, companyId } = params;

    // Se month è passato → range del mese; altrimenti usa from/to (default mese corrente)
    let from: string;
    let to: string;
    let label: string;
    if (params.from && params.to) {
      from = params.from;
      to = params.to;
      label = `${this.formatDateIt(from)} → ${this.formatDateIt(to)}`;
    } else {
      const month = params.month || this.currentMonth();
      const [year, mon] = month.split('-').map(Number);
      from = `${month}-01`;
      to = `${month}-${this.lastDayOfMonth(year, mon)}`;
      label = this.monthLabel(month);
    }

    const report = await this.piecesService.getPieces({
      scope: companyId ? 'company' : 'shop',
      tenantId,
      companyId: companyId || null,
      from,
      to,
      statuses: params.statuses,
      category: params.category,
      provider: params.provider,
      includePractices: true,
    });

    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const user = await this.userRepo.findOne({ where: { id: userId } });

    const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
    const exportsDir = path.join(process.cwd(), 'uploads', 'exports');
    if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });
    const fileName = `report-pezzi-${from}_${to}-${Date.now()}.pdf`;
    const filePath = path.join(exportsDir, fileName);
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const PAGE_W = 595; // A4
    const M = 40;
    const CONTENT_W = PAGE_W - M * 2;
    const PAGE_BOTTOM = 800;

    let y = M;

    // ===== Header =====
    doc.save();
    doc.fillColor('#0f172a').rect(0, 0, PAGE_W, 90).fill();
    doc.restore();
    doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold')
      .text('Report Pezzi Venduti', M, 28);
    doc.fontSize(10).font('Helvetica').fillColor('#cbd5e1')
      .text(label, M, 56);
    doc.fontSize(9).fillColor('#94a3b8')
      .text(
        `Generato il ${new Date().toLocaleDateString('it-IT')} • ${tenant?.name || 'N/D'} • ${
          [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'N/D'
        }`,
        M, 72,
      );
    y = 110;

    // ===== KPI Box =====
    const kpiH = 60;
    const kpiW = (CONTENT_W - 20) / 3;
    const kpis = [
      { label: 'Pezzi totali', value: String(report.grandTotal), color: '#0f766e' },
      { label: 'Operatori', value: String(report.rows.length), color: '#1d4ed8' },
      { label: 'Stati distinti', value: String(Object.keys(report.statusBreakdown || {}).length), color: '#a16207' },
    ];
    kpis.forEach((kpi, i) => {
      const x = M + i * (kpiW + 10);
      doc.save();
      doc.fillColor('#f8fafc').roundedRect(x, y, kpiW, kpiH, 6).fill();
      doc.restore();
      doc.fillColor('#64748b').fontSize(9).font('Helvetica').text(kpi.label, x + 12, y + 10);
      doc.fillColor(kpi.color).fontSize(22).font('Helvetica-Bold').text(kpi.value, x + 12, y + 24);
    });
    y += kpiH + 18;

    // ===== Riepilogo per Status =====
    const statusEntries = Object.entries(report.statusBreakdown || {}) as [string, number][];
    if (statusEntries.length > 0) {
      y = this.ensureSpace(doc, y, 60, M);
      doc.fillColor('#0f172a').fontSize(13).font('Helvetica-Bold').text('Riepilogo per stato', M, y);
      y += 20;
      const cols = 4;
      const gap = 8;
      const colW = (CONTENT_W - gap * (cols - 1)) / cols;
      const sorted = statusEntries.sort((a, b) => b[1] - a[1]);
      sorted.forEach(([st, count], ix) => {
        const col = ix % cols;
        const row = Math.floor(ix / cols);
        const x = M + col * (colW + gap);
        const cy = y + row * 38;
        const meta = this.statusMeta(st);
        doc.save();
        doc.fillColor(meta.bg).roundedRect(x, cy, colW, 32, 4).fill();
        doc.restore();
        doc.fillColor(meta.fg).fontSize(8).font('Helvetica-Bold').text(meta.label, x + 8, cy + 5);
        doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text(String(count), x + 8, cy + 15);
      });
      const rowsCount = Math.ceil(sorted.length / cols);
      y += rowsCount * 38 + 8;
    }

    // ===== Riepilogo Categoria + Provider (due colonne) =====
    const catEntries = Object.entries(report.categoryBreakdown || {}) as [string, number][];
    const provEntries = Object.entries(report.providerBreakdown || {}) as [string, number][];
    if (catEntries.length > 0 || provEntries.length > 0) {
      y = this.ensureSpace(doc, y, 30, M);
      doc.fillColor('#0f172a').fontSize(13).font('Helvetica-Bold').text('Distribuzione', M, y);
      y += 20;
      const colW = (CONTENT_W - 20) / 2;

      const drawList = (
        title: string,
        entries: [string, number][],
        x: number,
        labelFn: (k: string) => string,
      ) => {
        let ly = y;
        doc.fillColor('#334155').fontSize(10).font('Helvetica-Bold').text(title, x, ly);
        ly += 16;
        doc.fontSize(10).font('Helvetica').fillColor('#0f172a');
        entries
          .sort((a, b) => b[1] - a[1])
          .forEach(([k, v]) => {
            doc.text(`• ${labelFn(k)}`, x + 4, ly, { width: colW - 60 });
            doc.text(String(v), x + colW - 50, ly, { width: 40, align: 'right' });
            ly += 14;
          });
        return ly;
      };

      const catEnd = catEntries.length
        ? drawList('Per categoria', catEntries, M, (k) => this.catLabel(k))
        : y;
      const provEnd = provEntries.length
        ? drawList('Per provider', provEntries, M + colW + 20, (k) => k)
        : y;
      y = Math.max(catEnd, provEnd) + 10;
    }

    // ===== Classifica Operatori =====
    if (report.rows.length > 0) {
      y = this.ensureSpace(doc, y, 80, M);
      doc.fillColor('#0f172a').fontSize(13).font('Helvetica-Bold').text('Classifica operatori', M, y);
      y += 18;

      const headers = ['#', 'Operatore', 'Negozio', 'Attivati', 'In lavor.', 'KO/Annul.', 'Totale'];
      const widths = [28, 160, 110, 50, 50, 60, 57];
      this.drawRow(doc, M, y, headers, widths, { header: true });
      y += 22;

      report.rows.forEach((row: any, i: number) => {
        y = this.ensureSpace(doc, y, 22, M);
        const sb = row.statusBreakdown || {};
        const completed = sb.completed || 0;
        const inProgress = (sb.in_progress || 0) + (sb.draft || 0);
        const ko = sb.cancelled || 0;
        const cells = [
          `${i + 1}`,
          row.userName,
          this.lookupShopName(row.shopId, report.practices),
          String(completed),
          String(inProgress),
          String(ko),
          String(row.total),
        ];
        this.drawRow(doc, M, y, cells, widths, { header: false, alt: i % 2 === 1 });
        y += 20;
      });
      y += 14;

      // ===== Grafico a barre orizzontali (Top operatori) =====
      const topRows = report.rows.slice(0, 10); // max 10
      const maxTotal = topRows.reduce((m: number, r: any) => Math.max(m, r.total), 0) || 1;

      // Spazio richiesto: heading 28 + (rows * 22) + padding
      const chartNeeded = 28 + topRows.length * 22 + 10;
      y = this.ensureSpace(doc, y, chartNeeded, M);

      doc.fillColor('#0f172a').fontSize(13).font('Helvetica-Bold')
        .text('Grafico — Top operatori per pezzi', M, y);
      y += 22;

      // Layout barre: label sx (160px) + barra (max ~280px) + valore (60px)
      const labelW = 160;
      const valueW = 50;
      const barAreaW = CONTENT_W - labelW - valueW - 16;

      // Colori per status (stessi del riepilogo)
      const cCompleted = '#16a34a';
      const cInProgress = '#3b82f6';
      const cKo = '#dc2626';
      const cTrack = '#f1f5f9';

      topRows.forEach((row: any, i: number) => {
        const sb = row.statusBreakdown || {};
        const completed = sb.completed || 0;
        const inProgress = (sb.in_progress || 0) + (sb.draft || 0);
        const ko = sb.cancelled || 0;
        const total = row.total || (completed + inProgress + ko);

        const rowH = 18;
        // Label
        doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold')
          .text(`${i + 1}. ${row.userName}`, M, y + 4, {
            width: labelW - 8,
            ellipsis: true,
            lineBreak: false,
          });

        // Track
        const barX = M + labelW;
        doc.save();
        doc.fillColor(cTrack).roundedRect(barX, y, barAreaW, rowH, 3).fill();
        doc.restore();

        // Stack segments proporzionali al MASSIMO globale (così le barre sono confrontabili)
        const widthFor = (n: number) => (n / maxTotal) * barAreaW;
        let segX = barX;

        if (completed > 0) {
          const w = widthFor(completed);
          doc.save(); doc.fillColor(cCompleted).roundedRect(segX, y, w, rowH, 3).fill(); doc.restore();
          segX += w;
        }
        if (inProgress > 0) {
          const w = widthFor(inProgress);
          doc.save(); doc.fillColor(cInProgress).rect(segX, y, w, rowH).fill(); doc.restore();
          segX += w;
        }
        if (ko > 0) {
          const w = widthFor(ko);
          doc.save(); doc.fillColor(cKo).rect(segX, y, w, rowH).fill(); doc.restore();
          segX += w;
        }

        // Valore totale
        doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold')
          .text(String(total), barX + barAreaW + 8, y + 4, {
            width: valueW,
            align: 'left',
            lineBreak: false,
          });

        y += rowH + 4;
      });

      // Legenda
      y += 6;
      const drawLegend = (x: number, color: string, label: string) => {
        doc.save(); doc.fillColor(color).roundedRect(x, y + 2, 10, 10, 2).fill(); doc.restore();
        doc.fillColor('#475569').fontSize(8).font('Helvetica')
          .text(label, x + 14, y + 3, { lineBreak: false });
      };
      drawLegend(M, cCompleted, 'Attivati / Completati');
      drawLegend(M + 130, cInProgress, 'In lavorazione');
      drawLegend(M + 240, cKo, 'KO / Annullati');
      y += 22;
    }

    // ===== Dettaglio pratiche raggruppato per status =====
    const practices: any[] = report.practices || [];
    if (practices.length > 0) {
      const groups = new Map<string, any[]>();
      for (const p of practices) {
        const k = p.status || 'unknown';
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(p);
      }
      const order = ['completed', 'in_progress', 'draft', 'cancelled'];
      const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
        const ai = order.indexOf(a); const bi = order.indexOf(b);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });

      doc.addPage();
      y = M;
      doc.fillColor('#0f172a').fontSize(15).font('Helvetica-Bold')
        .text('Dettaglio pratiche per stato', M, y);
      y += 24;

      for (const stKey of sortedKeys) {
        const list = groups.get(stKey)!;
        const meta = this.statusMeta(stKey);
        y = this.ensureSpace(doc, y, 60, M);

        // Heading status
        doc.save();
        doc.fillColor(meta.bg).roundedRect(M, y, CONTENT_W, 24, 4).fill();
        doc.restore();
        doc.fillColor(meta.fg).fontSize(11).font('Helvetica-Bold')
          .text(`${meta.label}  (${list.length})`, M + 10, y + 7);
        y += 30;

        // Tabella
        const headers = ['Data', 'Cliente', 'Operatore', 'Categoria', 'Provider', 'St. operativo'];
        const widths = [62, 120, 110, 70, 70, 83];
        this.drawRow(doc, M, y, headers, widths, { header: true });
        y += 22;

        list.forEach((p, i) => {
          y = this.ensureSpace(doc, y, 22, M, () => {
            // re-disegna heading status quando si va a pagina nuova
            doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold')
              .text(`${meta.label} (continua)`, M, M);
            this.drawRow(doc, M, M + 22, headers, widths, { header: true });
            return M + 44;
          });
          const cells = [
            p.createdAt ? this.formatDateIt(new Date(p.createdAt).toISOString().slice(0, 10)) : '-',
            (p.customerName || '—').toString(),
            (p.sellerName || '—').toString(),
            this.catLabel(p.category || ''),
            (p.provider || '—').toString(),
            this.opStatusLabel(p.operationalStatus || p.skyTvStatus),
          ];
          this.drawRow(doc, M, y, cells, widths, { header: false, alt: i % 2 === 1 });
          y += 20;
        });
        y += 10;
      }
    }

    // ===== Footer pagine =====
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor('#94a3b8').font('Helvetica')
        .text(`Pagina ${i + 1} di ${pageCount}`, M, PAGE_BOTTOM + 10, {
          width: CONTENT_W,
          align: 'right',
        });
    }

    doc.end();
    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  private ensureSpace(doc: any, y: number, needed: number, margin: number, onNewPage?: () => number): number {
    if (y + needed > 800) {
      doc.addPage();
      return onNewPage ? onNewPage() : margin;
    }
    return y;
  }

  private drawRow(
    doc: any,
    x: number,
    y: number,
    cells: string[],
    widths: number[],
    opts: { header?: boolean; alt?: boolean } = {},
  ) {
    const rowHeight = 20;
    const totalW = widths.reduce((s, w) => s + w, 0);
    if (opts.header) {
      doc.save();
      doc.fillColor('#1e293b').rect(x, y, totalW, rowHeight).fill();
      doc.restore();
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);
    } else {
      if (opts.alt) {
        doc.save();
        doc.fillColor('#f8fafc').rect(x, y, totalW, rowHeight).fill();
        doc.restore();
      }
      doc.fillColor('#0f172a').font('Helvetica').fontSize(9);
    }
    let cx = x;
    for (let i = 0; i < cells.length; i++) {
      doc.text(String(cells[i] ?? ''), cx + 6, y + 6, {
        width: widths[i] - 12,
        ellipsis: true,
        lineBreak: false,
      });
      cx += widths[i];
    }
    doc.save();
    doc.strokeColor('#e2e8f0').lineWidth(0.5)
      .moveTo(x, y + rowHeight).lineTo(x + totalW, y + rowHeight).stroke();
    doc.restore();
  }

  private statusMeta(s: string): { label: string; bg: string; fg: string } {
    const m: Record<string, { label: string; bg: string; fg: string }> = {
      completed: { label: 'Completate / Attivate', bg: '#dcfce7', fg: '#166534' },
      in_progress: { label: 'In lavorazione', bg: '#dbeafe', fg: '#1e40af' },
      draft: { label: 'Bozza', bg: '#f1f5f9', fg: '#475569' },
      cancelled: { label: 'Annullate / KO', bg: '#fee2e2', fg: '#991b1b' },
    };
    return m[s] || { label: s || '—', bg: '#f1f5f9', fg: '#475569' };
  }

  private opStatusLabel(s: string | null | undefined): string {
    if (!s) return '—';
    const m: Record<string, string> = {
      PENDING: 'In attesa',
      IN_PROGRESS: 'In lavorazione',
      ACTIVATED: 'Attivata',
      REJECTED: 'Rifiutata',
      KO_CREDITO: 'KO Credito',
      KO_COPERTURA: 'KO Copertura',
      IN_LAVORAZIONE: 'In lavorazione',
      IN_VERIFICA_WM: 'In verifica WM',
      NON_SALITA_ARCADIA: 'Non salita Arcadia',
      ATTIVO: 'Attivo',
      KO_GENERICO: 'KO generico',
      KO_RINUNCIA_CLIENTE: 'KO rinuncia',
    };
    return m[s] || s;
  }

  private formatDateIt(iso: string): string {
    if (!iso) return '';
    const [y, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }

  private lookupShopName(shopId: string, practices?: any[]): string {
    if (!practices) return shopId.slice(0, 8);
    const p = practices.find((x) => x.shopId === shopId);
    return p?.shopName || shopId.slice(0, 8);
  }

  private currentMonth(): string { return new Date().toISOString().slice(0, 7); }
  private lastDayOfMonth(y: number, m: number): string { return String(new Date(y, m, 0).getDate()).padStart(2, '0'); }
  private monthLabel(ym: string): string { const [y, m] = ym.split('-').map(Number); const months = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']; return `${months[m - 1]} ${y}`; }
  private catLabel(cat: string): string { const map: Record<string, string> = { FIXED_LINE: 'Linea Fissa', MOBILE: 'Mobile', ENERGY: 'Energia', INSURANCE: 'Assicurazione', FINANCE: 'Finanza', CUSTOM: 'Custom' }; return map[cat] || cat; }
}