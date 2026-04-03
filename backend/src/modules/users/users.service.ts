import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Practice } from '../practices/entities/practice.entity';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Practice)
    private practiceRepository: Repository<Practice>,
  ) {}
  
  /**
   * Trova tutti gli utenti di un tenant
   */
  async findAllByTenant(tenantId: string): Promise<User[]> {
    return await this.usersRepository.find({
      where: { tenantId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Reset password da Super Admin
   * Genera password temporanea random
   */
  async resetPasswordBySuperAdmin(userId: string, tenantId: string): Promise<string> {
    const user = await this.usersRepository.findOne({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }

    // Genera password temporanea random (12 caratteri)
    const temporaryPassword = crypto.randomBytes(6).toString('hex'); // es: "a3f2e1d4c5b6"
    
    // Hash password
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
    user.passwordHash = hashedPassword; // Corretto: usa passwordHash, non password
    (user as any).mustChangePassword = true; // Flag per forzare cambio password al primo login

    await this.usersRepository.save(user);

    return temporaryPassword;
  }

  /**
   * Toggle attivo/disattivo utente
   */
  async toggleActive(userId: string, tenantId: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }

    user.isActive = !user.isActive;
    return await this.usersRepository.save(user);
  }

  /**
   * Elimina utente (Super Admin)
   */
  async deleteUserBySuperAdmin(userId: string, tenantId: string): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }

    // Verifica che non sia l'ultimo admin del tenant
    const adminCount = await this.usersRepository.count({
      where: { tenantId, role: 'ADMIN', isActive: true },
    });

    if (user.role === 'ADMIN' && adminCount <= 1) {
      throw new BadRequestException(
        'Impossibile eliminare l\'ultimo amministratore del negozio',
      );
    }

    await this.usersRepository.remove(user);
  }

  /**
   * Aggiorna dati utente (Super Admin)
   */
  async updateUserBySuperAdmin(
    userId: string,
    tenantId: string,
    updateData: { firstName?: string; lastName?: string; email?: string; role?: string },
  ): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }

    // Verifica se email è già in uso
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await this.usersRepository.findOne({
        where: { email: updateData.email },
      });

      if (existingUser) {
        throw new BadRequestException('Email già in uso');
      }
    }

    // Aggiorna campi (usando firstName/lastName invece di name)
    if (updateData.firstName) user.firstName = updateData.firstName;
    if (updateData.lastName) user.lastName = updateData.lastName;
    if (updateData.email) user.email = updateData.email;
    if (updateData.role) user.role = updateData.role as 'SUPER_ADMIN' | 'ADMIN' | 'FOUNDER' | 'OPERATOR';

    return await this.usersRepository.save(user);
  }

  /**
   * ✅ NUOVO: Aggiorna ruolo utente (solo per Super Admin)
   */
  async updateRole(userId: string, role: 'OPERATOR' | 'ADMIN' | 'FOUNDER'): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }

    user.role = role as any;
    return await this.usersRepository.save(user);
  }

  /**
   * ✅ NUOVO: Conta tutti gli utenti
   */
  async count(): Promise<number> {
    return await this.usersRepository.count();
  }
  
  async findByVerificationToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({ 
      where: { verificationToken: token },
      relations: ['tenant'] 
    });
  }

  async save(user: User): Promise<User> {
    return this.usersRepository.save(user);
  }

  async findByEmail(email: string, tenantId?: string): Promise<User | null> {
    const where: any = { email };
    if (tenantId) where.tenantId = tenantId;
    return this.usersRepository.findOne({ where, relations: ['tenant'] });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id }, relations: ['tenant'] });
  }

  async create(userData: Partial<User> & { password?: string }): Promise<User> {
    if (userData.password) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(userData.password, salt);
      delete userData.password;
      (userData as any).passwordHash = passwordHash;
    }
    
    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }

  async update(tenantId: string, userId: string, updateData: Partial<User> & { password?: string }): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id: userId, tenantId }
    });

    if (!user) throw new Error('Utente non trovato');

    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);
      (updateData as any).passwordHash = await bcrypt.hash(updateData.password, salt);
      delete updateData.password;
    }

    Object.assign(user, updateData);
    return this.usersRepository.save(user);
  }

  async findByEmailSuperAdmin(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ 
      where: { email },
      relations: ['tenant'] 
    });
  }

  async findAdminByTenantId(tenantId: string): Promise<User | null> {
    return this.usersRepository.findOne({ 
      where: { tenantId, role: 'ADMIN' },
      relations: ['tenant'] 
    });
  }

  /**
   * ✅ CRITICAL FIX: Trova admin o founder per impersonazione SuperAdmin
   * Cerca prima un FOUNDER, se non trovato cerca un ADMIN
   */
  async findAdminOrFounderByTenantId(tenantId: string): Promise<User | null> {
    // Cerca prima il FOUNDER (proprietario del negozio)
    const founder = await this.usersRepository.findOne({ 
      where: { tenantId, role: 'FOUNDER' },
      relations: ['tenant'] 
    });
    
    if (founder) return founder;
    
    // Fallback: cerca un ADMIN
    return this.usersRepository.findOne({ 
      where: { tenantId, role: 'ADMIN' },
      relations: ['tenant'] 
    });
  }

  async findOperatorsByTenantId(tenantId: string): Promise<User[]> {
    return this.usersRepository.find({
      where: [
        { tenantId, role: 'ADMIN', isActive: true },
        { tenantId, role: 'OPERATOR', isActive: true }
      ],
      select: ['id', 'firstName', 'lastName', 'email', 'role', 'isActive'],
      order: { firstName: 'ASC' }
    });
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  async remove(tenantId: string, userId: string): Promise<{ message: string; freedEmail: string }> {
    const user = await this.usersRepository.findOne({
      where: { id: userId, tenantId },
    });
    
    if (!user) throw new Error('Utente non trovato');

    if (user.role === 'ADMIN') {
      const adminCount = await this.usersRepository.count({ 
        where: { tenantId, role: 'ADMIN', isActive: true } 
      });
      if (adminCount <= 1) throw new Error('Impossibile eliminare l\'ultimo amministratore');
    }

    const userFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const email = user.email;

    try {
      // Usa query raw per evitare errori di tipo
      await this.practiceRepository.query(
        `UPDATE practices SET "createdByName" = $1 WHERE "createdById" = $2 AND "createdByName" IS NULL`,
        [userFullName, userId]
      );
      
      await this.practiceRepository.query(
        `UPDATE practices SET "assignedToName" = $1 WHERE "assignedToId" = $2 AND "assignedToName" IS NULL`,
        [userFullName, userId]
      );

      await this.practiceRepository.query(
        `UPDATE practices SET "assignedToId" = NULL WHERE "assignedToId" = $1 AND tenant_id = $2`,
        [userId, tenantId]
      );

      await this.usersRepository.delete(userId);
      
      return {
        message: `Operatore ${userFullName} eliminato.`,
        freedEmail: email
      };
    } catch (error) {
      console.error('Errore:', error);
      throw new Error(`Eliminazione fallita: ${error.message}`);
    }
  }
}