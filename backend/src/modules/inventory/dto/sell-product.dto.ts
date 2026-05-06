import { IsUUID, IsInt, IsNumber, Min, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class SellProductDto {
  @IsUUID()
  itemId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  /**
   * Venditore — obbligatorio. Chi ha materialmente venduto il dispositivo
   * al cliente. Questo è il campo che viene agganciato alle gare.
   * Se diverso da chi sta cliccando "salva" (es. admin che registra a posteriori),
   * permette di tracciare correttamente i pezzi venduti per ciascun operatore.
   */
  @IsUUID()
  @IsNotEmpty()
  soldByUserId: string;

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

  /**
   * Phase D minimal: metodo di pagamento applicato.
   * Valori liberi: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'POS' | 'FINANCING' | 'OTHER'.
   * Verrà salvato nel movimento per la chiusura cassa e i report.
   */
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
