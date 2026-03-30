import { IsUUID } from 'class-validator';

export class ExecuteImportDto {
  @IsUUID()
  jobId: string;
}