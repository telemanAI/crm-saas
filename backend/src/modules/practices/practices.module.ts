import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PracticesController } from './practices.controller';
import { PracticesService } from './practices.service';
import { Practice } from './entities/practice.entity';
import { User } from '../users/entities/user.entity';
import { CustomersModule } from '../customers/customers.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { CompetitionsModule } from '../competitions/competitions.module';

const JWT_SECRET = "super-secret-key-change-in-production";

@Module({
  imports: [
    TypeOrmModule.forFeature([Practice, User]),
    JwtModule.register({ secret: JWT_SECRET }),
    CustomersModule,
    MembershipsModule,
    forwardRef(() => CompetitionsModule),
  ],
  controllers: [PracticesController],
  providers: [PracticesService],
  exports: [PracticesService],
})
export class PracticesModule {}
