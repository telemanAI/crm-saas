import { IsEnum, IsString, IsArray, IsBoolean, IsOptional } from 'class-validator';
import { ImportTargetEntity } from '../entities/import-job.entity';

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(['CUSTOMER_ONLY', 'FIXED_LINE_PRACTICE', 'MOBILE_PRACTICE', 'ENERGY_PRACTICE'])
  targetEntity: ImportTargetEntity;

  @IsArray()
  columnMapping: Array<{
    source: string;
    target: string;
    transformer?: string;
    required: boolean;
  }>;

  @IsString()
  duplicateStrategy: 'SKIP' | 'UPDATE' | 'CREATE_NEW';

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
