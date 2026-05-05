import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import PDFDocument from 'pdfkit';
import { PiecesReportService } from '../pieces-report.service';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class PdfReportService {
  constructor(
    private readonly piecesService: PiecesReportService,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async generateMonthlyReport(params: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    month?: string; // YYYY-MM, default mese corrente
  }): Promise<Buffer> {
    const { tenantId, userId, companyId } = params;
    const month = params.month || this.currentMonth();
    const [year, mon] = month.split('-').map(Number);
    const from = `${month}-01`;
    const to = `${month}-${this.lastDayOfMonth(year, mon)}`;

    // Recupera dati
    const report = await this.piecesService.getPieces({
      scope: companyId ? 'company' : 'shop',
      tenantId,
      companyId: companyId || null,
      from,
      to,
    });

    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const user = await this.userRepo.findOne({ where: { id: userId } });

    // Genera PDF in memoria
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    // === HEADER ===
    doc.fontSize(20).font('Helvetica-Bold');
    doc.text('Report Mensile — Pezzi Venduti', 40, 40);

    doc.fontSize(10).font('Helvetica');
    doc.text(`Generato il: ${new Date().toLocaleDateString('it-IT')}`, 40, 70);
    doc.text(`Periodo: ${this.monthLabel(month)}`, 40, 85);
    doc.text(
      `Shop/Company: ${tenant?.name || 'N/D'}`,
      40,
      100,
    );
    doc.text(
      `Generato da: ${[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'N/D'}`,
      40,
      115,
    );

    // Linea separatrice
    doc.moveTo(40, 135).lineTo(555, 135).stroke('#cccccc');

    let y = 155;

    // === RIEPILOGO ===
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text('Riepilogo', 40, y);
    y += 25;

    doc.fontSize(11).font('Helvetica');
    doc.text(`Totale pezzi venduti: ${report.grandTotal}`, 40, y);
    y += 18;

    // Pezzi per categoria
    const catMap = new Map<string, number>();
    const provMap = new Map<string, number>();
    for (const row of report.rows) {
      for (const [key, count] of Object.entries(row.breakdown)) {
        const [cat, prov] = key.split('|');
        catMap.set(cat, (catMap.get(cat) || 0) + count);
        provMap.set(prov, (provMap.get(prov) || 0) + count);
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

    // === CLASSIFICA OPERATORI ===
    if (report.rows.length > 0) {
      y += 10;
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text('Classifica Operatori', 40, y);
      y += 25;

      // Tabella header
      this.drawTableRow(doc, 40, y, ['Pos', 'Operatore', 'Pezzi'], [40, 300, 80], true);
      y += 20;

      doc.font('Helvetica').fontSize(10);
      for (let i = 0; i < report.rows.length; i++) {
        const row = report.rows[i];
        if (y > 750) {
          doc.addPage();
          y = 40;
          this.drawTableRow(doc, 40, y, ['Pos', 'Operatore', 'Pezzi'], [40, 300, 80], true);
          y += 20;
          doc.font('Helvetica').fontSize(10);
        }
        this.drawTableRow(
          doc,
          40,
          y,
          [`${i + 1}`, row.userName, String(row.total)],
          [40, 300, 80],
          false,
          i % 2 === 1,
        );
        y += 18;
      }
    }

    // === FOOTER ===
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#999999')
        .text(
          `Pagina ${i + 1} di ${pageCount} — CRM SaaS`,
          40,
          810,
          { align: 'center', width: 515 },
        );
    }

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });
  }

  // === Helpers ===

  private drawTableRow(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    cells: string[],
    widths: number[],
    isHeader: boolean,
    altBg = false,
  ) {
    const rowHeight = 18;
    if (altBg) {
      doc.save();
      doc.fillColor('#f5f5f5').rect(x, y - 2, 515, rowHeight).fill();
      doc.restore();
    }
    if (isHeader) {
      doc.save();
      doc.fillColor('#e0e0e0').rect(x, y - 2, 515, rowHeight).fill();
      doc.restore();
      doc.font('Helvetica-Bold').fontSize(10);
    }
    let cx = x;
    for (let i = 0; i < cells.length; i++) {
      doc.fillColor('#333333').text(cells[i], cx + 4, y + 2, {
        width: widths[i] - 8,
        ellipsis: true,
      });
      cx += widths[i];
    }
    // Bordo inferiore
    doc.moveTo(x, y + rowHeight - 2).lineTo(x + 515, y + rowHeight - 2).stroke('#dddddd');
  }

  private currentMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private lastDayOfMonth(year: number, month: number): string {
    return String(new Date(year, month, 0).getDate()).padStart(2, '0');
  }

  private monthLabel(ym: string): string {
    const [y, m] = ym.split('-').map(Number);
    const months = [
      'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
      'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
    ];
    return `${months[m - 1]} ${y}`;
  }

  private catLabel(cat: string): string {
    const map: Record<string, string> = {
      FIXED_LINE: 'Linea Fissa',
      MOBILE: 'Mobile',
      ENERGY: 'Energia',
      INSURANCE: 'Assicurazione',
      FINANCE: 'Finanza',
      CUSTOM: 'Custom',
    };
    return map[cat] || cat;
  }
}
