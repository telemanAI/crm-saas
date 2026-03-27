import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EmailService } from '../email/email.service';
import { TenantsService } from '../tenants/tenants.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
    private readonly tenantsService: TenantsService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllUsers(@Request() req) {
    const tenantId = req.user.tenantId;
    
    if (!tenantId) {
      throw new UnauthorizedException('Tenant non specificato');
    }

    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Permessi insufficienti');
    }

    const users = await this.usersService.findOperatorsByTenantId(tenantId);
    
    return users.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
    }));
  }

  @Get('operators')
  @UseGuards(JwtAuthGuard)
  async getOperators(@Request() req) {
    const tenantId = req.user.tenantId;
    
    if (!tenantId) {
      throw new UnauthorizedException('Tenant non specificato');
    }

    const operators = await this.usersService.findOperatorsByTenantId(tenantId);
    
    return operators.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
    }));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getUserById(@Param('id') id: string, @Request() req) {
    const tenantId = req.user.tenantId;
    
    if (!tenantId) {
      throw new UnauthorizedException('Tenant non specificato');
    }

    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Permessi insufficienti');
    }

    const user = await this.usersService.findById(id);
    
    if (!user || user.tenantId !== tenantId) {
      throw new ForbiddenException('Utente non trovato');
    }

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    };
  }

  @Post()
@UseGuards(JwtAuthGuard)
async createUser(@Body() userData: any, @Request() req) {
  const tenantId = req.user.tenantId;
  
  if (!tenantId) {
    throw new UnauthorizedException('Tenant non specificato');
  }

  if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    throw new ForbiddenException('Solo gli amministratori possono creare operatori');
  }

  const existingUser = await this.usersService.findByEmail(userData.email, tenantId);
  if (existingUser) {
    throw new ForbiddenException('Email già registrata in questo negozio');
  }

  // Genera password temporanea e token verifica
  const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
  const verificationToken = uuidv4(); // ✅ Aggiungi import { v4 as uuidv4 } from 'uuid';
  const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const tenant = await this.tenantsService.findById(tenantId);

  // Invia email PRIMA di creare l'utente (fail fast)
  const emailSent = await this.emailService.sendOperatorVerificationEmail(
    userData.email,
    userData.firstName || 'Operatore',
    tempPassword,
    tenant.name,
    verificationToken
  );

  if (!emailSent) {
    throw new BadRequestException('Impossibile inviare l\'email di invito. Riprova più tardi.');
  }

  // Crea utente con email non verificata
  const newUser = await this.usersService.create({
    ...userData,
    password: tempPassword,
    tenantId: tenantId,
    isActive: true,
    emailVerified: false, // ✅ Falso finché non verifica
    verificationToken,
    verificationTokenExpires,
  });

  return {
    id: newUser.id,
    firstName: newUser.firstName,
    lastName: newUser.lastName,
    email: newUser.email,
    role: newUser.role,
    message: 'Operatore creato. Deve verificare l\'email prima di accedere.'
  };
}

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateUser(@Param('id') id: string, @Body() userData: any, @Request() req) {
    const tenantId = req.user.tenantId;
    
    if (!tenantId) {
      throw new UnauthorizedException('Tenant non specificato');
    }

    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Solo gli amministratori possono modificare operatori');
    }

    // Non permettere di modificare se stessi togliendo i privilegi di admin
    if (req.user.sub === id && userData.role && userData.role !== 'ADMIN') {
      throw new ForbiddenException('Non puoi toglierti i privilegi di amministratore da solo');
    }

    // Verifica che l'email non sia già usata da un altro utente
    if (userData.email) {
      const existingUser = await this.usersService.findByEmail(userData.email, tenantId);
      if (existingUser && existingUser.id !== id) {
        throw new ForbiddenException('Email già utilizzata da un altro operatore');
      }
    }

    const updatedUser = await this.usersService.update(tenantId, id, userData);
    
    return {
      id: updatedUser.id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      role: updatedUser.role,
      isActive: updatedUser.isActive,
      message: 'Operatore aggiornato con successo'
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteUser(@Param('id') id: string, @Request() req) {
    const tenantId = req.user.tenantId;
    
    if (!tenantId) {
      throw new UnauthorizedException('Tenant non specificato');
    }

    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Solo gli amministratori possono eliminare operatori');
    }

    if (req.user.sub === id) {
      throw new ForbiddenException('Non puoi eliminare il tuo account');
    }

    await this.usersService.remove(tenantId, id);
    
    return {
      message: 'Operatore eliminato con successo'
    };
  }
}