import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { TenantsModule } from '../tenants/tenants.module'; // ✅ Aggiungi questo import

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    TenantsModule, // ✅ Aggiungi qui
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}