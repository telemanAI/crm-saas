import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Practice } from '../practices/entities/practice.entity'; // ✅ AGGIUNGI
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Practice) // ✅ OK
    private practiceRepository: Repository<Practice>,
  ) {}
  
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

    try {
      // Salva nome nelle pratiche prima di eliminare
      await this.practiceRepository.update(
        { createdById: userId, createdByName: null },
        { createdByName: userFullName }
      );
      
      await this.practiceRepository.update(
        { assignedToId: userId, assignedToName: null },
        { assignedToName: userFullName }
      );

      // Dissocia pratiche attive
      await this.practiceRepository.update(
        { assignedToId: userId, tenantId },
        { assignedToId: null }
      );

      const email = user.email;
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