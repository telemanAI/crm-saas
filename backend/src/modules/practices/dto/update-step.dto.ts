import { IsOptional, IsString, IsObject, IsInt, Min, Max } from 'class-validator';

export class UpdateStepDto {
  @IsInt()
  @Min(1)
  @Max(20)
  stepNumber: number;

  @IsOptional()
  @IsObject()
  data?: any;

  @IsOptional()
  @IsString()
  notes?: string;
}

