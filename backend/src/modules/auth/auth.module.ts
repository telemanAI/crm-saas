import { Module, forwardRef } from '@nestjs/common';
import { TenantsModule } from '../tenants/tenants.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthFlowsController } from './auth-flows.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { User } from '../users/entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { UsersModule } from '../users/users.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { CompaniesModule } from '../companies/companies.module';
import { InvitesModule } from '../invites/invites.module';

// Nuovi asset
import { OtpCode } from './entities/otp-code.entity';
import { PendingRegistration } from './entities/pending-registration.entity';
import { OtpService } from './services/otp.service';
import { SocialAuthService } from './services/social-auth.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { GoogleAuthGuard, FacebookAuthGuard } from './guards/oauth.guards';
import { PermissionsGuard } from './guards/permissions.guard';

const strategies: any[] = [JwtStrategy];
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  strategies.push(GoogleStrategy);
}
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  strategies.push(FacebookStrategy);
}

@Module({
  imports: [
    forwardRef(() => TenantsModule),
    TypeOrmModule.forFeature([User, Tenant, OtpCode, PendingRegistration]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
    UsersModule,
    // MembershipsModule esporta MembershipsService, necessario per:
    //  - PermissionsGuard (guard globale auth)
    //  - AuthController.debug (nuovo endpoint diagnostico)
    //  - SocialAuthService.switchActiveShop
    MembershipsModule,
    CompaniesModule,
    InvitesModule,
  ],
  controllers: [AuthController, AuthFlowsController],
  providers: [
    AuthService,
    OtpService,
    SocialAuthService,
    ...strategies,
    JwtAuthGuard,
    RolesGuard,
    GoogleAuthGuard,
    FacebookAuthGuard,
    PermissionsGuard,
  ],
  exports: [
    AuthService,
    OtpService,
    SocialAuthService,
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
  ],
})
export class AuthModule {}
