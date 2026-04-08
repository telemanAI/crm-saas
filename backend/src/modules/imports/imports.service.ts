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

  // ... altri metodi esistenti ...

  async rollbackImport(
    jobId: string, 
    tenantId: string, 
    mode: 'full' | 'partial' = 'full'
  ): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // ✅ Trova il job dentro la transazione per lock ottimistico
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
        // ✅ 1. TROVA le pratiche create da questo import
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

          // ✅ 1.1 PRIMA: Cancella dipendenze delle pratiche (se esistono)
          // Esempi commentati - decommenta se hai queste tabelle:
          /*
          await queryRunner.manager
            .createQueryBuilder()
            .delete()
            .from('payments')
            .where('practiceId IN (:...practiceIds)', { practiceIds })
            .andWhere('tenantId = :tenantId', { tenantId })
            .execute();

          await queryRunner.manager
            .createQueryBuilder()
            .delete()
            .from('practice_documents')
            .where('practiceId IN (:...practiceIds)', { practiceIds })
            .andWhere('tenantId = :tenantId', { tenantId })
            .execute();
          */

          // ✅ 1.2 SECONDO: Cancella le pratiche (dipendono dai clienti)
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

        // ✅ 2. TROVA i clienti creati da questo import
        const customers = await queryRunner.manager
          .createQueryBuilder()
          .select('id')
          .from('customers', 'c')
          .where('c.sourceImportJobId = :jobId', { jobId })
          .andWhere('c.tenantId = :tenantId', { tenantId })
          .getRawMany();

        if (customers.length > 0) {
          console.log(`[ROLLBACK] Job ${jobId}: trovati ${customers.length} clienti`);

          // ✅ 3. TERZO: Cancella i clienti (dopo aver liberato le FK dalle pratiche)
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

      // ✅ 4. Aggiorna stato job e timestamp rollback
      job.status = 'rolled_back';
      job.rollbackedAt = new Date(); // ✅ Tracciamento quando è avvenuto
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

      // ✅ Gestione specifica errore Foreign Key PostgreSQL (23503)
      if (error.code === '23503') {
        throw new InternalServerErrorException(
          'Rollback fallito: esistono ancora dipendenze collegate (pratiche o dati associati non eliminabili). Controlla che non ci siano riferimenti esterni ai clienti o pratiche create da questo import.'
        );
      }
      
      throw new InternalServerErrorException(`Errore durante il rollback: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  // ... resto del service ...
}