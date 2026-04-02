import {
  Controller,
  Put,
  Param,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * PUT /api/admin/users/:id/role
   * Super Admin può cambiare il ruolo di qualsiasi utente (incluso FOUNDER)
   */
  @Put(':id/role')
  async changeUserRole(
    @Param('id') userId: string,
    @Body('role') role: 'OPERATOR' | 'ADMIN' | 'FOUNDER',
  ) {
    if (!role || !['OPERATOR', 'ADMIN', 'FOUNDER'].includes(role)) {
      throw new BadRequestException('Ruolo non valido');
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('Utente non trovato');
    }

    // Super Admin può cambiare qualsiasi ruolo
    const updatedUser = await this.usersService.updateRole(userId, role);

    return {
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
      },
      message: `Ruolo aggiornato a ${role}`,
    };
  }
}
