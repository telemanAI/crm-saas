import * as XLSX from 'xlsx';
import * as fs from 'fs';

export interface ParsedExcelData {
  headers: string[];
  rows: any[];
  totalRows: number;
  sheetNames: string[];
}

export class ExcelParser {
  static parse(filePath: string, sheetIndex: number = 0): ParsedExcelData {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[sheetIndex];
    const worksheet = workbook.Sheets[sheetName];
    
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length === 0) {
      throw new Error('File Excel vuoto');
    }

    const headers = jsonData[0] as string[];
    const dataRows = jsonData.slice(1).filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''));
    
    const rows = dataRows.map((row, index) => {
      const rowObject: any = { _rowNumber: index + 2 };
      headers.forEach((header, colIndex) => {
        rowObject[header] = row[colIndex] !== undefined ? row[colIndex] : null;
      });
      return rowObject;
    });

    return {
      headers: headers.filter(h => h),
      rows,
      totalRows: rows.length,
      sheetNames: workbook.SheetNames,
    };
  }

  static async parsePreview(filePath: string, maxRows: number = 10): Promise<ParsedExcelData> {
    const fullData = this.parse(filePath);
    return {
      ...fullData,
      rows: fullData.rows.slice(0, maxRows),
    };
  }
}