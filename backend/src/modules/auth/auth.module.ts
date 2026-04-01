import { Module, forwardRef } from '@nestjs/common';
import { TenantsModule } from '../tenants/tenants.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard'; // ? AGGIUNGI
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    forwardRef(() => TenantsModule),
    TypeOrmModule.forFeature([User]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard, // ? AGGIUNGI
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    RolesGuard, // ? AGGIUNGI
  ],
})
export class AuthModule {}

