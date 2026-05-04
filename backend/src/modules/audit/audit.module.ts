import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR, APP_FILTER, HttpAdapterHost } from '@nestjs/core';
import { AuditLog } from './entities/audit-log.entity';
import { SystemError } from './entities/system-error.entity';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditInterceptor } from './audit.interceptor';
import { SystemErrorsService } from './system-errors.service';
import { SystemErrorsController } from './system-errors.controller';
import { AllExceptionsFilter } from './all-exceptions.filter';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, SystemError])],
  controllers: [AuditController, SystemErrorsController],
  providers: [
    AuditService,
    SystemErrorsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    {
      provide: APP_FILTER,
      useFactory: (
        httpAdapterHost: HttpAdapterHost,
        systemErrorsService: SystemErrorsService,
      ) => new AllExceptionsFilter(httpAdapterHost, systemErrorsService),
      inject: [HttpAdapterHost, SystemErrorsService],
    },
  ],
  exports: [AuditService, SystemErrorsService, TypeOrmModule],
})
export class AuditModule {}