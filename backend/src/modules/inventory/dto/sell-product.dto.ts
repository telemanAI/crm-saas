import { IsUUID, IsInt, IsNumber, Min, IsOptional, IsString } from 'class-validator';

export class SellProductDto {
  @IsUUID()
  itemId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  /** Prezzo di vendita applicato a questa transazione (override su sellingPrice del prodotto). */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitSalePrice?: number;

  /** Cliente associato (opzionale). */
  @IsOptional()
  @IsUUID()
  customerId?: string;

  /** Pratica del cliente associata (opzionale, valida solo se customerId è presente). */
  @IsOptional()
  @IsUUID()
  practiceId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
