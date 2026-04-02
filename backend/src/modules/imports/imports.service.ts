import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImportJob } from './entities/import-job.entity';
import { ImportTemplate } from './entities/import-template.entity';
import { ExcelParser } from './parsers/excel.parser';
import { FixedLineAdapter } from './adapters/fixed-line.adapter';
import { CreateTemplateDto } from './dto/create-template.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ImportsService {
  constructor(
    @InjectRepository(ImportJob)
    private importJobRepository: Repository<ImportJob>,
    @InjectRepository(ImportTemplate)
    private importTemplateRepository: Repository<ImportTemplate>,
    private fixedLineAdapter: FixedLineAdapter,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    targetEntity: string,
    tenantId: string,
    userId: string,
    templateId?: string,
  ): Promise<ImportJob> {
    // Salva file su disco
    const uploadsDir = path.join(process.cwd(), 'uploads', 'imports');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = `${Date.now()}_${file.originalname}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    // Parse preview
    const preview = await ExcelParser.parsePreview(filePath, 10);

    // Crea job
    const job = this.importJobRepository.create({
      tenantId,
      createdBy: userId,
      targetEntity: targetEntity as any,
      fileName: file.originalname,
      filePath,
      fileSize: file.size,
      status: 'pending',
      templateId,
      stats: {
        totalRows: preview.totalRows,
        processedRows: 0,
        successfulRows: 0,
        failedRows: 0,
        skippedRows: 0,
        createdCustomers: 0,
        updatedCustomers: 0,
        createdPractices: 0,
      },
    });

    return await this.importJobRepository.save(job);
  }

  async getPreview(jobId: string, tenantId: string): Promise<any> {
    const job = await this.importJobRepository.findOne({
      where: { id: jobId, tenantId },
    });

    if (!job) {
      throw new NotFoundException('Import job non trovato');
    }

async countRecent(days: number): Promise<number> {
  const date = new Date();
  date.setDate(date.getDate() - days);
  
  return await this.importJobsRepository.count({
    where: {
      createdAt: MoreThan(date),
    },
  });
}


    const preview = await ExcelParser.parsePreview(job.filePath, 10);
    
    // Se c'è un template, carica il mapping
    let suggestedMapping = null;
    if (job.templateId) {
      const template = await this.importTemplateRepository.findOne({
        where: { id: job.templateId, tenantId },
      });
      if (template) {
        suggestedMapping = template.columnMapping;
      }
    }

    return {
      headers: preview.headers,
      previewRows: preview.rows,
      totalRows: preview.totalRows,
      suggestedMapping,
    };
  }

  async validateImport(jobId: string, mappingConfig: any, tenantId: string): Promise<any> {
    const job = await this.importJobRepository.findOne({
      where: { id: jobId, tenantId },
    });

    if (!job) {
      throw new NotFoundException('Import job non trovato');
    }

    // Parse completo
    const parsedData = ExcelParser.parse(job.filePath);
    
    const validationResults = {
      valid: 0,
      warnings: 0,
      errors: 0,
      preview: [] as any[],
    };

    // Valida prime 100 righe per preview
    const rowsToValidate = parsedData.rows.slice(0, 100);
    
    for (const row of rowsToValidate) {
      let result;
      
      if (job.targetEntity === 'FIXED_LINE_PRACTICE') {
        result = await this.fixedLineAdapter.validateRow(row, mappingConfig, tenantId);
      } else if (job.targetEntity === 'CUSTOMER_ONLY') {
        result = await this.validateCustomerRow(row, mappingConfig);
      } else {
        throw new BadRequestException(`Target entity ${job.targetEntity} non ancora implementato`);
      }

      if (result.valid) {
        validationResults.valid++;
      } else {
        validationResults.errors++;
      }

      if (result.warnings.length > 0) {
        validationResults.warnings++;
      }

      validationResults.preview.push({
        rowNumber: row._rowNumber,
        valid: result.valid,
        errors: result.errors,
        warnings: result.warnings,
        data: result.data,
      });
    }

    // Salva configurazione e risultati validazione
    job.mappingConfig = mappingConfig;
    job.validationResults = validationResults;
    await this.importJobRepository.save(job);

    return validationResults;
  }

  async executeImport(jobId: string, tenantId: string, userId: string): Promise<ImportJob> {
    const job = await this.importJobRepository.findOne({
      where: { id: jobId, tenantId },
    });

    if (!job) {
      throw new NotFoundException('Import job non trovato');
    }

    if (!job.mappingConfig) {
      throw new BadRequestException('Mapping non configurato');
    }

    job.status = 'processing';
    job.startedAt = new Date();
    await this.importJobRepository.save(job);

    try {
      const parsedData = ExcelParser.parse(job.filePath);
      const errorLog: any[] = [];

      let successfulRows = 0;
      let failedRows = 0;
      let createdCustomers = 0;
      let updatedCustomers = 0;
      let createdPractices = 0;

      for (const row of parsedData.rows) {
        try {
          if (job.targetEntity === 'FIXED_LINE_PRACTICE') {
            const result = await this.fixedLineAdapter.processRow(
              row,
              job.mappingConfig,
              tenantId,
              userId,
            );
            
            if (result.customer) {
              // Controlla se è nuovo o aggiornato (logica semplificata)
              createdCustomers++;
            }
            if (result.practice) {
              createdPractices++;
            }
            successfulRows++;
          } else if (job.targetEntity === 'CUSTOMER_ONLY') {
            await this.processCustomerRow(row, job.mappingConfig, tenantId);
            createdCustomers++;
            successfulRows++;
          }
        } catch (error) {
          failedRows++;
          errorLog.push({
            row: row._rowNumber,
            error: error.message,
            rawData: row,
            level: 'error',
          });
        }
      }

      job.status = 'completed';
      job.completedAt = new Date();
      job.stats = {
        ...job.stats,
        processedRows: parsedData.totalRows,
        successfulRows,
        failedRows,
        skippedRows: 0,
        createdCustomers,
        updatedCustomers,
        createdPractices,
      };
      job.errorLog = errorLog;
    } catch (error) {
      job.status = 'failed';
      job.errorLog = [{ row: 0, error: error.message, rawData: {}, level: 'error' }];
    }

    return await this.importJobRepository.save(job);
  }

  private async validateCustomerRow(row: any, mapping: any): Promise<any> {
    // Implementazione semplificata per CUSTOMER_ONLY
    const errors: string[] = [];
    const warnings: string[] = [];
    const data: any = {};

    mapping.columns.forEach(col => {
      data[col.target] = row[col.source];
    });

    if (!data.firstName) errors.push('Nome obbligatorio');
    if (!data.lastName) errors.push('Cognome obbligatorio');
    if (!data.phonePrimary) errors.push('Telefono obbligatorio');

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      data,
    };
  }

  private async processCustomerRow(row: any, mapping: any, tenantId: string): Promise<void> {
    // Stub per CUSTOMER_ONLY - da implementare
    throw new Error('CUSTOMER_ONLY non ancora implementato completamente');
  }

  async getJobs(tenantId: string): Promise<ImportJob[]> {
    return await this.importJobRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async getJob(jobId: string, tenantId: string): Promise<ImportJob> {
    const job = await this.importJobRepository.findOne({
      where: { id: jobId, tenantId },
    });

    if (!job) {
      throw new NotFoundException('Import job non trovato');
    }

    return job;
  }

  // Template Management
  async createTemplate(dto: CreateTemplateDto, tenantId: string, userId: string): Promise<ImportTemplate> {
    const template = this.importTemplateRepository.create({
      ...dto,
      tenantId,
      createdBy: userId,
    });

    return await this.importTemplateRepository.save(template);
  }

  async getTemplates(tenantId: string, targetEntity?: string): Promise<ImportTemplate[]> {
    const where: any = { tenantId, isActive: true };
    if (targetEntity) {
      where.targetEntity = targetEntity;
    }

    return await this.importTemplateRepository.find({
      where,
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  getTargetFields(targetEntity: string): any[] {
    if (targetEntity === 'FIXED_LINE_PRACTICE') {
      return this.fixedLineAdapter.getTargetFields();
    }
    // Aggiungi altri adapter qui
    return [];
  }
}