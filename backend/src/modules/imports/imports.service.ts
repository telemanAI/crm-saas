import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, DataSource, In } from 'typeorm';
import { ImportJob } from './entities/import-job.entity';
import { ImportTemplate } from './entities/import-template.entity';
import { ExcelParser } from './parsers/excel.parser';
import { FixedLineAdapter } from './adapters/fixed-line.adapter';
import { UnifiedAdapter } from './adapters/unified.adapter';
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
    private unifiedAdapter: UnifiedAdapter,
    private dataSource: DataSource,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    targetEntity: string,
    tenantId: string,
    userId: string,
    templateId?: string,
    fileFormat: 'flat' | 'relational' = 'flat',
  ): Promise<ImportJob> {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'imports');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = `${Date.now()}_${file.originalname}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    const preview = await ExcelParser.parsePreview(filePath, 10);

    const effectiveTarget = targetEntity || 'UNIFIED_IMPORT';

    const job = this.importJobRepository.create({
      tenantId,
      createdBy: userId,
      targetEntity: effectiveTarget as any,
      fileName: file.originalname,
      filePath,
      fileSize: file.size,
      fileFormat,
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
        matchedByCache: 0,
        matchedByDB: 0,
      },
    });

    return await this.importJobRepository.save(job);
  }

  async getPreview(jobId: string, tenantId: string): Promise<any> {
    const job = await this.importJobRepository.findOne({
      where: { id: jobId, tenantId },
    });

    if (!job) throw new NotFoundException('Import job non trovato');

    const preview = await ExcelParser.parsePreview(job.filePath, 10);
    
    let suggestedMapping = null;
    if (job.templateId) {
      const template = await this.importTemplateRepository.findOne({
        where: { id: job.templateId, tenantId },
      });
      if (template) suggestedMapping = template.columnMapping;
    }

    return {
      headers: preview.headers,
      previewRows: preview.rows,
      totalRows: preview.totalRows,
      suggestedMapping,
      fileFormat: job.fileFormat || 'flat',
    };
  }

  async validateImport(jobId: string, mappingConfig: any, tenantId: string, rowCorrections?: any[]): Promise<any> {
    const job = await this.importJobRepository.findOne({
      where: { id: jobId, tenantId },
    });

    if (!job) throw new NotFoundException('Import job non trovato');

    this.unifiedAdapter.resetCache();

    const parsedData = ExcelParser.parse(job.filePath);
    
    const validationResults = {
      valid: 0,
      warnings: 0,
      errors: 0,
      preview: [] as any[],
      summary: {
        totalCustomers: 0,
        customersWithPractice: 0,
        onlyCustomers: 0,
        newCustomers: 0,
        existingCustomers: 0,
      }
    };

    // 🔥 Converti rowCorrections in mappa per accesso rapido
    const correctionsMap = new Map();
    if (rowCorrections) {
      for (const corr of rowCorrections) {
        correctionsMap.set(corr.rowNumber, corr);
      }
    }

    const rowsToValidate = parsedData.rows.slice(0, 100);

    for (const row of rowsToValidate) {
      // 🔥 Applica correzioni se presenti
      const correction = correctionsMap.get(row._rowNumber);
      if (correction?.skipped) {
        // Riga saltata, non validare
        continue;
      }
      if (correction?.correctedData) {
        // Applica dati corretti
        Object.assign(row, correction.correctedData);
      }
      let result;
      
      if (job.targetEntity === 'UNIFIED_IMPORT') {
        result = await this.unifiedAdapter.validateRow(row, mappingConfig, tenantId);
        
        if (result.valid) {
          validationResults.summary.totalCustomers++;
          if (result.data.hasPractice) {
            validationResults.summary.customersWithPractice++;
          } else {
            validationResults.summary.onlyCustomers++;
          }
        }
      } else {
        result = await this.fixedLineAdapter.validateRow(row, mappingConfig, tenantId);
      }

      if (result.valid && result.warnings.length === 0) validationResults.valid++;
      else if (result.valid) validationResults.warnings++;
      else validationResults.errors++;

      validationResults.preview.push({
        rowNumber: row._rowNumber,
        valid: result.valid,
        errors: result.errors,
        warnings: result.warnings,
        data: result.data,
        hasPractice: result.data?.hasPractice || false,
      });
    }

    job.mappingConfig = mappingConfig;
    job.validationResults = validationResults;
    await this.importJobRepository.save(job);

    return validationResults;
  }

  async executeImport(jobId: string, tenantId: string, userId: string, rowCorrections?: any[]): Promise<ImportJob> {
    const job = await this.importJobRepository.findOne({
      where: { id: jobId, tenantId },
    });

    if (!job) throw new NotFoundException('Import job non trovato');
    if (!job.mappingConfig) throw new BadRequestException('Mapping non configurato');

    this.unifiedAdapter.resetCache();

    job.status = 'processing';
    job.startedAt = new Date();
    await this.importJobRepository.save(job);

    try {
      const parsedData = ExcelParser.parse(job.filePath);
      const errorLog: any[] = [];

      let successfulRows = 0;
      let failedRows = 0;
      let skippedRows = 0;

      // 🔥 Converti rowCorrections in mappa per accesso rapido
      const correctionsMap = new Map();
      if (rowCorrections) {
        for (const corr of rowCorrections) {
          correctionsMap.set(corr.rowNumber, corr);
        }
      }
      let createdCustomers = 0;
      let updatedCustomers = 0;
      let createdPractices = 0;
      let cacheHits = 0;
      let dbHits = 0;

      const BATCH_SIZE = 100;
      const totalRows = parsedData.rows.length;

      for (let i = 0; i < totalRows; i += BATCH_SIZE) {
        const batch = parsedData.rows.slice(i, i + BATCH_SIZE);
        
        for (const row of batch) {
          // 🔥 Applica correzioni se presenti
          const correction = correctionsMap.get(row._rowNumber);
          if (correction?.skipped) {
            skippedRows++;
            continue;
          }
          if (correction?.correctedData) {
            Object.assign(row, correction.correctedData);
          }

          try {
            if (job.targetEntity === 'UNIFIED_IMPORT') {
              const strategy = job.mappingConfig.duplicateStrategy || 'UPDATE';
              
              const result = await this.unifiedAdapter.processRow(
                row,
                job.mappingConfig,
                tenantId,
                userId,
                strategy,
              );
              
              if (result.customer) {
                if (result.action.includes('CREATED_CUSTOMER')) {
                  createdCustomers++;
                } else {
                  updatedCustomers++;
                }
              }
              
              if (result.practice) createdPractices++;
              
              if (result.action.includes('fiscalCode') || result.action.includes('email') || result.action.includes('phone')) {
                if (result.action.includes('cache')) cacheHits++;
                else dbHits++;
              }
              
              successfulRows++;
            } else {
              const result = await this.fixedLineAdapter.processRow(
                row, job.mappingConfig, tenantId, userId,
              );
              if (result.customer) createdCustomers++;
              if (result.practice) createdPractices++;
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

        job.stats.processedRows = i + batch.length;
        await this.importJobRepository.save(job);
      }

      job.status = failedRows > 0 && successfulRows === 0 ? 'failed' : 'completed';
      job.completedAt = new Date();
      job.stats = {
        ...job.stats,
        processedRows: totalRows,
        successfulRows,
        failedRows,
        skippedRows,
        createdCustomers,
        updatedCustomers,
        createdPractices,
        matchedByCache: cacheHits,
        matchedByDB: dbHits,
      };
      job.errorLog = errorLog;
      
    } catch (error) {
      job.status = 'failed';
      job.errorLog = [{ row: 0, error: error.message, rawData: {}, level: 'error' }];
    }

    return await this.importJobRepository.save(job);
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
    if (!job) throw new NotFoundException('Import job non trovato');
    return job;
  }

  async getJobWithFullDetails(jobId: string, tenantId?: string): Promise<ImportJob> {
    const where: any = { id: jobId };
    if (tenantId) where.tenantId = tenantId;
    
    const job = await this.importJobRepository.findOne({ where });
    if (!job) throw new NotFoundException('Job non trovato');
    
    return job;
  }

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
    if (targetEntity) where.targetEntity = targetEntity;

    return await this.importTemplateRepository.find({
      where,
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  getTargetFields(targetEntity: string): any[] {
    if (targetEntity === 'UNIFIED_IMPORT') {
      return this.unifiedAdapter.getTargetFields();
    }
    if (targetEntity === 'FIXED_LINE_PRACTICE') {
      return this.fixedLineAdapter.getTargetFields();
    }
    return [];
  }

  async countRecent(days: number): Promise<number> {
    const date = new Date();
    date.setDate(date.getDate() - days);
    
    return await this.importJobRepository.count({
      where: { createdAt: MoreThan(date) },
    });
  }

  async rollbackImport(
    jobId: string, 
    tenantId: string, 
    mode: 'full' | 'partial' = 'full'
  ): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const job = await queryRunner.manager.findOne(ImportJob, {
        where: { id: jobId, tenantId },
      });

      if (!job) {
        throw new NotFoundException('Job non trovato');
      }

      if (job.status !== 'completed') {
        throw new BadRequestException('Solo i job completati possono essere rollbaccati');
      }

      let deletedPractices = 0;
      let deletedCustomers = 0;

      if (mode === 'full') {
        const practices = await queryRunner.manager
          .createQueryBuilder()
          .select('id')
          .from('practices', 'p')
          .where('p.sourceImportJobId = :jobId', { jobId })
          .andWhere('p.tenantId = :tenantId', { tenantId })
          .getRawMany();

        const practiceIds = practices.map(p => p.id);

        if (practiceIds.length > 0) {
          console.log(`[ROLLBACK] Job ${jobId}: trovate ${practiceIds.length} pratiche`);

          const practicesResult = await queryRunner.manager
            .createQueryBuilder()
            .delete()
            .from('practices')
            .where('sourceImportJobId = :jobId', { jobId })
            .andWhere('tenantId = :tenantId', { tenantId })
            .execute();
          
          deletedPractices = practicesResult.affected || 0;
          console.log(`[ROLLBACK] Cancellate ${deletedPractices} pratiche`);
        }

        const customers = await queryRunner.manager
          .createQueryBuilder()
          .select('id')
          .from('customers', 'c')
          .where('c.sourceImportJobId = :jobId', { jobId })
          .andWhere('c.tenantId = :tenantId', { tenantId })
          .getRawMany();

        if (customers.length > 0) {
          console.log(`[ROLLBACK] Job ${jobId}: trovati ${customers.length} clienti`);

          const customersResult = await queryRunner.manager
            .createQueryBuilder()
            .delete()
            .from('customers')
            .where('sourceImportJobId = :jobId', { jobId })
            .andWhere('tenantId = :tenantId', { tenantId })
            .execute();
          
          deletedCustomers = customersResult.affected || 0;
          console.log(`[ROLLBACK] Cancellati ${deletedCustomers} clienti`);
        }
      }

      job.status = 'rolled_back';
      job.rollbackedAt = new Date();
      await queryRunner.manager.save(job);

      await queryRunner.commitTransaction();
      console.log(`[ROLLBACK] Completato con successo per job ${jobId}`);

      return {
        deletedPractices,
        deletedCustomers,
        mode,
        rollbackedAt: job.rollbackedAt,
      };
      
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(`[ROLLBACK ERROR] Job ${jobId}:`, error);

      if (error.code === '23503') {
        throw new InternalServerErrorException(
          'Rollback fallito: esistono ancora dipendenze collegate (pratiche o dati associati non eliminabili).'
        );
      }
      
      throw new InternalServerErrorException(`Errore durante il rollback: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }
}