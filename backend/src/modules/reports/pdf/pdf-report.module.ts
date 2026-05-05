import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PdfReportService } from './pdf-report.service';
import { PdfReportController } from './pdf-report.controller';
import { PiecesReportService } from '../pieces-report.service';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import { Practice } from '../../practices/entities/practice.entity';
import { Offer } from '../../offers/entities/offer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, User, Practice, Offer])],
  providers: [PdfReportService, PiecesReportService],
  controllers: [PdfReportController],
})
export class PdfReportModule {}
