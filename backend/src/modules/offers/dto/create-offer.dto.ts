import { IsString, IsOptional, IsBoolean, IsNumber, IsIn, IsEnum, IsObject } from 'class-validator';

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

  /**
   * Dettagli strutturati specifici per categoria (JSONB).
   * Es. per MOBILE: { minutes, sms, gb, has_5g, abroad_gb, postepay... }
   * Es. per ENERGY: { fornitura, tipologia, tipo_offerta, f1, pcv, pagamento... }
   */
  @IsObject()
  @IsOptional()
  details?: Record<string, any>;
}
