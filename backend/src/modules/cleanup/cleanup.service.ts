import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Tenant)
    private tenantsRepository: Repository<Tenant>,
  ) {}

  // Esegue ogni giorno alle 3:00 AM
    @Cron('*/10 * * * *')
    async cleanupUnverifiedUsers() {
   this.logger.log('🧹 Avvio pulizia utenti non verificati (ogni 10 min)...');
    
    const now = new Date();
    let deletedCount = 0;
    let tenantDeletedCount = 0;
    
    try {
      // Trova utenti non verificati con token scaduto (più di 24 ore)
      const unverifiedUsers = await this.usersRepository.find({
        where: {
          emailVerified: false,
          verificationTokenExpires: LessThan(now),
        },
        relations: ['tenant'],
      });

      if (unverifiedUsers.length === 0) {
        this.logger.log('✅ Nessun utente non verificato da eliminare');
        return;
      }

      this.logger.log(`⚠️ Trovati ${unverifiedUsers.length} utenti non verificati scaduti`);

      for (const user of unverifiedUsers) {
        try {
          // Se è un admin e l'unico del tenant, elimina anche il tenant (negozio orfano)
          if (user.role === 'ADMIN' && user.tenant) {
            const tenantUsersCount = await this.usersRepository.count({
              where: { tenantId: user.tenantId },
            });
            
            if (tenantUsersCount <= 1) {
              this.logger.log(`🏪 Eliminazione tenant orfano: ${user.tenant.name} (${user.tenantId})`);
              await this.tenantsRepository.delete(user.tenantId);
              tenantDeletedCount++;
            }
          }
          
          // Dissocia pratiche prima di eliminare (sicurezza extra)
          await this.usersRepository.manager
            .createQueryBuilder()
            .update('practices')
            .set({ assignedToId: null })
            .where('assignedToId = :userId', { userId: user.id })
            .execute();

          // Elimina l'utente
          await this.usersRepository.delete(user.id);
          this.logger.log(`👤 Utente eliminato: ${user.email}`);
          deletedCount++;
          
        } catch (error) {
          this.logger.error(`❌ Errore eliminazione utente ${user.email}:`, error);
        }
      }

      this.logger.log(`✅ Pulizia completata: ${deletedCount} utenti e ${tenantDeletedCount} tenant eliminati`);
    } catch (error) {
      this.logger.error('❌ Errore durante la pulizia:', error);
    }
  }

  // Metodo manuale per test (puoi chiamarlo da un endpoint admin se necessario)
  async runCleanupNow(): Promise<{ usersDeleted: number; tenantsDeleted: number }> {
    const initialUserCount = await this.usersRepository.count({ where: { emailVerified: false } });
    await this.cleanupUnverifiedUsers();
    const finalUserCount = await this.usersRepository.count({ where: { emailVerified: false } });
    
    return {
      usersDeleted: initialUserCount - finalUserCount,
      tenantsDeleted: 0 // Aggiornato nella logica sopra se necessario
    };
  }
}