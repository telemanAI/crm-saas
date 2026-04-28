import { IsString, IsOptional, IsInt, IsNumber, Min, IsBoolean, IsUUID, IsObject, MaxLength } from 'class-validator';

export class CreateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  sku?: string; // se omesso, viene auto-generato

  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsUUID()
  groupId?: string | null;

  /** Valori dei campi custom del gruppo, es. { imei: '...', colore: 'Rosso' } */
  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isForSale?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  reorderLevel?: number;

  /** Prezzo di acquisto — solo founder/admin può settarlo */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost?: number;

  /** Prezzo di vendita */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  sellingPrice?: number;
}
