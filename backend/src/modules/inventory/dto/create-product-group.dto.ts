import { IsString, IsInt, Min, IsOptional, IsArray, ValidateNested, IsEnum, IsBoolean, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CustomFieldDefDto {
  @IsString()
  @MaxLength(60)
  fieldKey: string;

  @IsString()
  @MaxLength(120)
  fieldLabel: string;

  @IsEnum(['STRING', 'NUMBER', 'BOOLEAN'])
  fieldType: 'STRING' | 'NUMBER' | 'BOOLEAN';

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateProductGroupDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFieldDefDto)
  customFields?: CustomFieldDefDto[];
}
