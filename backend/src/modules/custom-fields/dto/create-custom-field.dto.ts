import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum, IsJSON } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCustomFieldDto {
  @ApiProperty({ example: 'customer', enum: ['customer', 'lead', 'deal', 'ticket'] })
  @IsEnum(['customer', 'lead', 'deal', 'ticket'])
  entityType: string;

  @ApiProperty({ example: 'partita_iva', description: 'Nome tecnico del campo (snake_case)' })
  @IsString()
  fieldName: string;

  @ApiProperty({ example: 'Partita IVA', description: 'Etichetta visualizzata' })
  @IsString()
  fieldLabel: string;

  @ApiProperty({ example: 'text', enum: ['text', 'number', 'date', 'datetime', 'boolean', 'select', 'multiselect', 'textarea', 'email', 'url', 'currency'] })
  @IsEnum(['text', 'number', 'date', 'datetime', 'boolean', 'select', 'multiselect', 'textarea', 'email', 'url', 'currency'])
  fieldType: string;

  @ApiProperty({ required: false })
  @IsOptional()
  options?: {
    choices?: string[];
    min?: number;
    max?: number;
  };

  @ApiProperty({ required: false })
  @IsOptional()
  validationRules?: {
    min?: number;
    max?: number;
    regex?: string;
  };

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean = false;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  defaultValue?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  placeholder?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  helpText?: string;

  @ApiProperty({ default: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number = 0;
}
