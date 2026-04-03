import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ImportTargetEntity } from '../entities/import-job.entity';

export class UploadFileDto {
  @IsEnum(['CUSTOMER_ONLY', 'FIXED_LINE_PRACTICE', 'MOBILE_PRACTICE', 'ENERGY_PRACTICE', 'UNIFIED_IMPORT'])
  targetEntity: ImportTargetEntity;

  @IsOptional()
  @IsUUID()
  templateId?: string;
}