import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { CustomersModule } from './modules/customers/customers.module';
import { PracticesModule } from './modules/practices/practices.module';
import { CustomFieldsModule } from './modules/custom-fields/custom-fields.module';
import { AuditModule } from './modules/audit/audit.module';
import { CashModule } from './modules/cash/cash.module';
import { InventoryModule } from './modules/inventory/inventory.module';
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

// Entities
import { User } from './modules/users/entities/user.entity';
import { Tenant } from './modules/tenants/entities/tenant.entity';
import { Customer } from './modules/customers/entities/customer.entity';
import { Practice } from './modules/practices/entities/practice.entity';
import { CustomField } from './modules/custom-fields/entities/custom-field.entity';
import { CustomFieldValue } from './modules/custom-fields/entities/custom-field-value.entity';
import { AuditLog } from './modules/audit/entities/audit-log.entity';
import { CashClosing } from './modules/cash/entities/cash-closing.entity';
import { CashRegister } from './modules/cash/entities/cash-register.entity';
import { CashTransaction } from './modules/cash/entities/cash-transaction.entity';
import { InventoryItem } from './modules/inventory/entities/inventory-item.entity';
import { InventoryMovement } from './modules/inventory/entities/inventory-movement.entity';
import { SalesPractice } from './modules/sales/entities/sales-practice.entity';
import { Offer } from './modules/offers/entities/offer.entity';

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
        CashClosing,
        CashRegister,
        CashTransaction,
        InventoryItem,
        InventoryMovement,
        SalesPractice,
        Offer,
		ImportJob,         
        ImportTemplate,
      ],
      synchronize: process.env.TYPEORM_SYNC === 'true' || process.env.NODE_ENV === 'development',
      logging: process.env.NODE_ENV === 'development',
    }),

    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),

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
    SalesModule,
    StatsModule,
    OffersModule,
	SuperAdminModule,
    EmailModule,
    CleanupModule,
	ImportsModule,      
    ExportsModule, 
  ],
})
export class AppModule {}