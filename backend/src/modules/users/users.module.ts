import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AdminUsersController } from './admin-users.controller';
import { EmailModule } from '../email/email.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    EmailModule,
    forwardRef(() => TenantsModule), // ✅ FIX: Aggiunto forwardRef per dipendenza circolare
  ],
  controllers: [
    UsersController,
    AdminUsersController,
  ],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}