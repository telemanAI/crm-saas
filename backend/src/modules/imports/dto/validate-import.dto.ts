import { IsUUID, IsObject } from 'class-validator';

export class ValidateImportDto {
  @IsUUID()
  jobId: string;

  @IsObject()
  mappingConfig: {
    columns: Array<{
      source: string;
      target: string;
      transformer?: string;
    }>;
    duplicateStrategy: 'SKIP' | 'UPDATE' | 'CREATE_NEW';
  };
}