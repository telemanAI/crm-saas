import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { ImportJob } from './entities/import-job.entity';
import { Practice } from '../practices/entities/practice.entity';
import { Customer } from '../customers/entities/customer.entity';

@Injectable()
export class SuperAdminImportsService {
  constructor(
    @InjectRepository(ImportJob)
    private importJobRepository: Repository<ImportJob>,
    @InjectRepository(Practice)
    private practiceRepository: Repository<Practice>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
  ) {}

  async getAllJobsAllTenants(): Promise<ImportJob[]> {
    return await this.importJobRepository.find({
      relations: ['tenant', 'creator'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async pauseJob(jobId: string): Promise<void> {
    const job = await this.importJobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Job non trovato');
    }

    if (job.status !== 'processing') {
      throw new Error('Solo job in processing possono essere messi in pausa');
    }

    job.status = 'pending' as any; // Usa 'pending' come paused
    await this.importJobRepository.save(job);
  }

  async resumeJob(jobId: string): Promise<void> {
    const job = await this.importJobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Job non trovato');
    }

    job.status = 'processing';
    await this.importJobRepository.save(job);

    // Qui puoi rilanciare il processing
    // In un sistema reale, metteresti il job di nuovo nella coda
  }

  async skipRow(jobId: string, rowNumber: number): Promise<void> {
    const job = await this.importJobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Job non trovato');
    }

    // Aggiungi la riga skipped al log
    job.errorLog = job.errorLog || [];
    job.errorLog.push({
      row: rowNumber,
      error: 'Riga saltata manualmente da Super Admin',
      rawData: {},
      level: 'warning',
    });

    job.stats.skippedRows = (job.stats.skippedRows || 0) + 1;

    await this.importJobRepository.save(job);
  }

  async rollback(jobId: string, mode: 'partial' | 'full'): Promise<any> {
    const job = await this.importJobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Job non trovato');
    }

    let deletedPractices = 0;
    let deletedCustomers = 0;

    if (mode === 'full' || mode === 'partial') {
      // Cancella tutte le pratiche create da questo import
      // NOTA: Serve aggiungere sourceImportJobId alle entità Practice e Customer
      const practices = await this.practiceRepository.find({
        where: { notes: `Import ID: ${jobId}` } as any, // Placeholder - implementa tracking corretto
      });

      for (const practice of practices) {
        await this.practiceRepository.remove(practice);
        deletedPractices++;
      }
    }

    if (mode === 'full') {
      // Cancella anche i clienti creati (solo se non hanno altre pratiche)
      const customers = await this.customerRepository.find({
        where: { notes: `Import ID: ${jobId}` } as any, // Placeholder
      });

      for (const customer of customers) {
        const practiceCount = await this.practiceRepository.count({
          where: { customerId: customer.id },
        });

        if (practiceCount === 0) {
          await this.customerRepository.remove(customer);
          deletedCustomers++;
        }
      }
    }

    // Aggiorna job
    job.status = 'cancelled';
    await this.importJobRepository.save(job);

    return {
      deletedPractices,
      deletedCustomers,
      message: `Rollback completato: ${deletedPractices} pratiche e ${deletedCustomers} clienti rimossi`,
    };
  }

  async getConflicts(jobId: string): Promise<any> {
    const job = await this.importJobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Job non trovato');
    }

    // Ritorna i conflitti rilevati durante la validazione
    return job.errorLog?.filter(e => e.error.includes('duplicat')) || [];
  }

  async remapJob(jobId: string, mappingConfig: any, dryRun: boolean = true): Promise<void> {
    const job = await this.importJobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Job non trovato');
    }

    if (dryRun) {
      // Simula il nuovo mapping senza salvare
      // Implementa logica di preview
    } else {
      job.mappingConfig = mappingConfig;
      await this.importJobRepository.save(job);
    }
  }
}