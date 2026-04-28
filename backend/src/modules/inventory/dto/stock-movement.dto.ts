import { IsUUID, IsInt, IsNumber, Min, IsOptional, IsString, IsEnum } from 'class-validator';

export class StockMovementDto {
  @IsUUID()
  itemId: string;

  /** Quantità sempre positiva: il segno è dato dal `movementType`. */
  @IsInt()
  @Min(1)
  quantity: number;

  @IsEnum(['PURCHASE', 'ADJUST_IN', 'ADJUST_OUT'])
  movementType: 'PURCHASE' | 'ADJUST_IN' | 'ADJUST_OUT';

  /** Prezzo di acquisto unitario (per restock). */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
