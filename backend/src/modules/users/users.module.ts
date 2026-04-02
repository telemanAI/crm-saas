import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AdminUsersController } from './admin-users.controller'; // ✅ NUOVO
import { EmailModule } from '../email/email.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    EmailModule,
    TenantsModule,
  ],
  controllers: [
    UsersController,
    AdminUsersController, // ✅ NUOVO
  ],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}