import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImportJob } from './entities/import-job.entity';

@Injectable()
export class SuperAdminImportsService {
  constructor(
    @InjectRepository(ImportJob)
    private readonly importJobRepository: Repository<ImportJob>,
  ) {}

  async findAllJobs(filters: { 
    status?: string; 
    tenantId?: string; 
    dateFrom?: Date; 
    dateTo?: Date; 
  }): Promise<ImportJob[]> {
    const query = this.importJobRepository.createQueryBuilder('job')
      .leftJoinAndSelect('job.tenant', 'tenant')
      .leftJoinAndSelect('job.creator', 'creator')
      .orderBy('job.createdAt', 'DESC');

    if (filters.status) {
      query.andWhere('job.status = :status', { status: filters.status });
    }
    if (filters.tenantId) {
      query.andWhere('job.tenantId = :tenantId', { tenantId: filters.tenantId });
    }
    if (filters.dateFrom) {
      query.andWhere('job.createdAt >= :dateFrom', { dateFrom: filters.dateFrom });
    }
    if (filters.dateTo) {
      query.andWhere('job.createdAt <= :dateTo', { dateTo: filters.dateTo });
    }

    return await query.getMany();
  }

  async pauseJob(jobId: string): Promise<ImportJob> {
    const job = await this.importJobRepository.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job non trovato');
    
    job.status = 'paused';
    return await this.importJobRepository.save(job);
  }

  async resumeJob(jobId: string): Promise<ImportJob> {
    const job = await this.importJobRepository.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job non trovato');
    
    job.status = 'processing';
    return await this.importJobRepository.save(job);
  }

  async skipRow(jobId: string, rowNumber: number): Promise<ImportJob> {
    const job = await this.importJobRepository.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job non trovato');
    
    if (!job.errorLog) job.errorLog = [];
    
    // ✅ FIX: Aggiunto rawData: {} obbligatorio
    job.errorLog.push({
      row: rowNumber,
      error: `Riga ${rowNumber} saltata manualmente da admin`,
      rawData: {},
      level: 'warning',
      timestamp: new Date().toISOString(),
    });
    
    return await this.importJobRepository.save(job);
  }

  async retryJob(jobId: string, tenantId: string): Promise<{ newJobId: string }> {
    const oldJob = await this.importJobRepository.findOne({ 
      where: { id: jobId, tenantId } 
    });
    
    if (!oldJob) throw new NotFoundException('Job originale non trovato');

    // ✅ FIX: Usa mappingConfig unificato invece di campi separati (duplicateStrategy, columnMapping)
    const newJob = this.importJobRepository.create({
      tenantId,
      createdBy: oldJob.createdBy,
      targetEntity: oldJob.targetEntity,
      fileName: `retry_${oldJob.fileName}`,
      filePath: oldJob.filePath,
      fileSize: oldJob.fileSize,
      fileFormat: oldJob.fileFormat,
      status: 'pending',
      mappingConfig: oldJob.mappingConfig, // ✅ Contiene duplicateStrategy, columns, validationRules
      templateId: oldJob.templateId,
      stats: {
        totalRows: oldJob.stats?.totalRows || 0,
        processedRows: 0,
        successfulRows: 0,
        failedRows: 0,
        skippedRows: 0,
        createdCustomers: 0,
        updatedCustomers: 0,
        createdPractices: 0,
      },
      errorLog: [],
    });

    const saved = await this.importJobRepository.save(newJob);
    return { newJobId: saved.id };
  }

  async simulateImport(jobId: string, tenantId: string): Promise<any> {
    const job = await this.importJobRepository.findOne({ 
      where: { id: jobId, tenantId } 
    });
    
    if (!job) throw new NotFoundException('Job non trovato');

    // ✅ FIX: Tipo completo per validationResults con valori di default sicuri
    const validation = job.validationResults || { 
      valid: 0, 
      warnings: 0, 
      errors: 0, 
      preview: [],
      summary: {
        totalCustomers: 0,
        customersWithPractice: 0,
        newCustomers: 0,
        existingCustomers: 0
      }
    };

    const totalRows = job.stats?.totalRows || 0;
    
    let withPractice = 0;
    let onlyCustomer = 0;
    
    validation.preview?.forEach((row: any) => {
      if (row.hasPractice) withPractice++;
      else onlyCustomer++;
    });

    // ✅ FIX: Usa valori di default sicuri da validation.summary
    return {
      totalRows,
      wouldCreateCustomers: (validation.summary?.totalCustomers || 0) || (onlyCustomer + withPractice),
      wouldCreatePractices: (validation.summary?.customersWithPractice || 0) || withPractice,
      wouldUpdateExisting: validation.summary?.existingCustomers || 0,
      strategy: job.mappingConfig?.duplicateStrategy || 'UPDATE',
      fileFormat: job.fileFormat || 'flat',
      quality: this.assessDataQuality(validation.preview),
    };
  }

  async getGlobalStats(days: number): Promise<{
    total: number;
    completed: number;
    failed: number;
    processing: number;
    paused: number;
    activeNow: number;
    successRate: number;
    failureRate: number;
  }> {
    const date = new Date();
    date.setDate(date.getDate() - days);
    
    const jobs = await this.importJobRepository
      .createQueryBuilder('job')
      .where('job.createdAt >= :date', { date })
      .getMany();
    
    const total = jobs.length;
    const completed = jobs.filter(j => j.status === 'completed').length;
    const failed = jobs.filter(j => j.status === 'failed').length;
    const processing = jobs.filter(j => j.status === 'processing').length;
    const paused = jobs.filter(j => j.status === 'paused').length;
    const activeNow = processing;
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const failureRate = total > 0 ? Math.round((failed / total) * 100) : 0;
    
    return {
      total,
      completed,
      failed,
      processing,
      paused,
      activeNow,
      successRate,
      failureRate,
    };
  }

  async logAdminAction(data: { 
    action: string; 
    jobId: string; 
    tenantId: string; 
    adminId: string; 
    reason: string; 
    timestamp: Date; 
  }): Promise<void> {
    // Qui puoi implementare il salvataggio su audit log
    console.log('[ADMIN ACTION]', {
      ...data,
      timestamp: data.timestamp.toISOString(),
    });
  }

  private assessDataQuality(preview: any[]): string {
    if (!preview || preview.length === 0) return 'unknown';
    const validRows = preview.filter(p => p.isValid !== false).length;
    const ratio = validRows / preview.length;
    if (ratio > 0.95) return 'excellent';
    if (ratio > 0.8) return 'good';
    return 'needs_review';
  }
}