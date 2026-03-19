import { IsString, IsOptional, IsBoolean, IsNumber, IsIn } from 'class-validator';

export class CreateOfferDto {
  @IsString()
  provider: string;

  @IsString()
  name: string;

  @IsString()
  canone: string;

  @IsString()
  @IsOptional()
  attivazione?: string;

  @IsString()
  @IsOptional()
  vincolo?: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  @IsOptional()
  disattivazione?: string;

  @IsString()
  @IsIn(['consumer', 'business'])
  type: string;

  @IsString()
  @IsOptional()
  scadenza?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsNumber()
  @IsOptional()
  sort_order?: number;
}