import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { Customer } from './entities/customer.entity';
import { Practice } from '../practices/entities/practice.entity';
import { CustomFieldsModule } from '../custom-fields/custom-fields.module';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { MembershipsModule } from '../memberships/memberships.module';
import { JWT_SECRET } from '../auth/jwt-config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, Practice]),
    JwtModule.register({
      secret: JWT_SECRET,
      signOptions: { expiresIn: '24h' },
    }),
    CustomFieldsModule,
    MembershipsModule,
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}