import { IsString, IsOptional, IsBoolean, IsNumber, IsIn, IsEnum } from 'class-validator';

export class CreateOfferDto {
  /**
   * Categoria offerta. Default FIXED_LINE (retrocompat per chi chiama
   * il vecchio endpoint senza il parametro).
   */
  @IsEnum(['FIXED_LINE', 'MOBILE', 'ENERGY'])
  @IsOptional()
  category?: 'FIXED_LINE' | 'MOBILE' | 'ENERGY';

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
