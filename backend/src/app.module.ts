
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { JWT_SECRET } from './modules/auth/jwt-config';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { CustomersModule } from './modules/customers/customers.module';
import { PracticesModule } from './modules/practices/practices.module';
import { CustomFieldsModule } from './modules/custom-fields/custom-fields.module';
import { AuditModule } from './modules/audit/audit.module';
import { CashModule } from './modules/cash/cash.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { CompetitionsModule } from './modules/competitions/competitions.module';
import { ScheduleModule } from '@nestjs/schedule';
import { Competition } from './modules/competitions/entities/competition.entity';
import { CompetitionTarget } from './modules/competitions/entities/competition-target.entity';
import { CompetitionPrize } from './modules/competitions/entities/competition-prize.entity';
import { CompetitionEntry } from './modules/competitions/entities/competition-entry.entity';
import { SalesModule } from './modules/sales/sales.module';
import { StatsModule } from './modules/stats/stats.module';
import { OffersModule } from './modules/offers/offers.module';
import { EmailModule } from './modules/email/email.module';
import { ReportsModule } from './modules/reports/reports.module';
import { CleanupModule } from './modules/cleanup/cleanup.module';
import { ImportsModule } from './modules/imports/imports.module';
import { ExportsModule } from './modules/exports/exports.module';
import { ImportJob } from './modules/imports/entities/import-job.entity';
import { ImportTemplate } from './modules/imports/entities/import-template.entity';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { InvitesModule } from './modules/invites/invites.module';
import { HealthModule } from './modules/health/health.module';
import { NotificationsModule } from './modules/notifications/notifications.module';


// Entities
import { User } from './modules/users/entities/user.entity';
import { Notification } from './modules/notifications/entities/notification.entity';
import { Tenant } from './modules/tenants/entities/tenant.entity';
import { Customer } from './modules/customers/entities/customer.entity';
import { Practice } from './modules/practices/entities/practice.entity';
import { CustomField } from './modules/custom-fields/entities/custom-field.entity';
import { CustomFieldValue } from './modules/custom-fields/entities/custom-field-value.entity';
import { AuditLog } from './modules/audit/entities/audit-log.entity';
import { SystemError } from './modules/audit/entities/system-error.entity';
import { CashClosing } from './modules/cash/entities/cash-closing.entity';
import { CashRegister } from './modules/cash/entities/cash-register.entity';
import { CashTransaction } from './modules/cash/entities/cash-transaction.entity';
import { InventoryItem } from './modules/inventory/entities/inventory-item.entity';
import { InventoryMovement } from './modules/inventory/entities/inventory-movement.entity';
import { ProductGroup } from './modules/inventory/entities/product-group.entity';
import { ProductCustomField } from './modules/inventory/entities/product-custom-field.entity';
import { SalesPractice } from './modules/sales/entities/sales-practice.entity';
import { Offer } from './modules/offers/entities/offer.entity';
import { Company } from './modules/companies/entities/company.entity';
import { UserShopMembership } from './modules/memberships/entities/user-shop-membership.entity';
import { Invite } from './modules/invites/entities/invite.entity';
import { OtpCode } from './modules/auth/entities/otp-code.entity';
import { PendingRegistration } from './modules/auth/entities/pending-registration.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'crm_user',
      password: process.env.DB_PASSWORD || 'crm_password',
      database: process.env.DB_NAME || 'crm_db',
      entities: [
        User,
        Tenant,
        Customer,
        Practice,
        CustomField,
        CustomFieldValue,
        AuditLog,
        SystemError,
        CashClosing,
        CashRegister,
        CashTransaction,
        InventoryItem,
        InventoryMovement,
        ProductGroup,
        ProductCustomField,
        Competition,
        CompetitionTarget,
        CompetitionPrize,
        CompetitionEntry,
        SalesPractice,
        Offer,
        ImportJob,
        ImportTemplate,
        // NUOVE v2
        Company,
        UserShopMembership,
        Invite,
        OtpCode,
        PendingRegistration,
        // Notifiche
        Notification,
      ],
      synchronize: process.env.TYPEORM_SYNC === 'true' || process.env.NODE_ENV === 'development',
      logging: process.env.NODE_ENV === 'development',
    }),

    JwtModule.register({
      global: true,
      secret: JWT_SECRET,
      signOptions: { expiresIn: '24h' },
    }),

    // Rate limiting: 60 req/min default, protezione brute-force
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),

    AuthModule,
    TenantsModule,
    UsersModule,
    CustomersModule,
    PracticesModule,
    CustomFieldsModule,
    AuditModule,
    CashModule,
    ReportsModule,
    InventoryModule,
    CompetitionsModule,
    ScheduleModule.forRoot(),
    SalesModule,
    StatsModule,
    OffersModule,
    SuperAdminModule,
    EmailModule,
    CleanupModule,
    ImportsModule,
    ExportsModule,
    // NUOVI v2
    CompaniesModule,
    MembershipsModule,
    InvitesModule,
    HealthModule,
    NotificationsModule,
  ],
  providers: [
    // Rate limiter globale — 60 req/min di default
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
