import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ImportJob } from './entities/import-job.entity';

@Injectable()
export class SuperAdminImportsService {
  constructor(
    @InjectRepository(ImportJob)
    private importJobRepository: Repository<ImportJob>,
  ) {}

  // ==========================================
  // OPERAZIONI BASE (Esistenti)
  // ==========================================

  async findAllJobs(filters: {
    status?: string;
    tenantId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    const where: any = {};
    
    if (filters.status) where.status = filters.status;
    if (filters.tenantId) where.tenantId = filters.tenantId;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt = { ...where.createdAt, $gte: filters.dateFrom };
      if (filters.dateTo) where.createdAt = { ...where.createdAt, $lte: filters.dateTo };
    }

    return await this.importJobRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: 100,
    });
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
    
    job.errorLog.push({
      row: rowNumber,
      error: `Riga ${rowNumber} saltata manualmente da admin`,
      level: 'warning',
      timestamp: new Date().toISOString(),
    });
    
    return await this.importJobRepository.save(job);
  }

  // ==========================================
  // OPERAZIONI AVANZATE (Nuove)
  // ==========================================

  async retryJob(jobId: string, tenantId: string): Promise<{ newJobId: string }> {
    const oldJob = await this.importJobRepository.findOne({ 
      where: { id: jobId, tenantId } 
    });
    
    if (!oldJob) throw new NotFoundException('Job originale non trovato');

    // Crea nuovo job copiato dal vecchio ma resettato
    const newJob = this.importJobRepository.create({
      tenantId,
      createdBy: oldJob.createdBy,
      targetEntity: oldJob.targetEntity,
      fileName: `retry_${oldJob.fileName}`,
      filePath: oldJob.filePath,
      fileSize: oldJob.fileSize,
      fileFormat: oldJob.fileFormat,
      status: 'pending',
      mappingConfig: oldJob.mappingConfig,
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

    // Analisi simulata basata sui dati già presenti
    const validation = job.validationResults || { preview: [] };
    const totalRows = job.stats?.totalRows || 0;
    
    // Conta tipologie
    let withPractice = 0;
    let onlyCustomer = 0;
    
    validation.preview?.forEach((row: any) => {
      if (row.hasPractice) withPractice++;
      else onlyCustomer++;
    });

    return {
      totalRows,
      wouldCreateCustomers: validation.summary?.totalCustomers || onlyCustomer + withPractice,
      wouldCreatePractices: validation.summary?.customersWithPractice || withPractice,
      wouldUpdateExisting: validation.summary?.existingCustomers || 0,
      strategy: job.mappingConfig?.duplicateStrategy || 'UPDATE',
      fileFormat: job.fileFormat || 'flat',
      quality: this.assessDataQuality(validation.preview),
    };
  }

  async getGlobalStats(days: number): Promise<any> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [total, completed, failed, processing, paused] = await Promise.all([
      this.importJobRepository.count({ where: { createdAt: MoreThan(since) as any } }),
      this.importJobRepository.count({ where: { status: 'completed', createdAt: MoreThan(since) as any } }),
      this.importJobRepository.count({ where: { status: 'failed', createdAt: MoreThan(since) as any } }),
      this.importJobRepository.count({ where: { status: 'processing', createdAt: MoreThan(since) as any } }),
      this.importJobRepository.count({ where: { status: 'paused', createdAt: MoreThan(since) as any } }),
    ]);

    const activeNow = await this.importJobRepository.count({ 
      where: { status: 'processing' } 
    });

    return {
      total,
      completed,
      failed,
      processing,
      paused,
      activeNow,
      successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      failureRate: total > 0 ? Math.round((failed / total) * 100) : 0,
    };
  }

  async logAdminAction(action: {
    action: string;
    jobId: string;
    tenantId: string;
    adminId: string;
    reason: string;
    timestamp: Date;
  }): Promise<void> {
    // Log strutturato per audit
    console.log(JSON.stringify({
      type: 'ADMIN_AUDIT',
      ...action,
    }));
    
    // Qui puoi aggiungere salvataggio su DB se hai una tabella audit_logs
  }

  private assessDataQuality(preview: any[]): string {
    if (!preview || preview.length === 0) return 'unknown';
    
    const valid = preview.filter((r: any) => r.valid).length;
    const rate = (valid / preview.length) * 100;
    
    if (rate === 100) return 'excellent';
    if (rate >= 90) return 'good';
    if (rate >= 70) return 'fair';
    return 'poor';
  }
}