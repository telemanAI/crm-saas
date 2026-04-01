import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { Practice } from '../practices/entities/practice.entity'; // ✅ AGGIUNGI
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Practice]), // ✅ AGGIUNGI Practice qui
    forwardRef(() => TenantsModule),
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
