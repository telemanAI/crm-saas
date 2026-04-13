import { IsEnum, IsOptional, IsString, ValidateNested, IsUUID, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

class CustomerDataDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  fiscalCode: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  email?: string;
}

class LineDataDto {
  @IsEnum(['NUOVA', 'MIGRAZIONE'])
  lineType: 'NUOVA' | 'MIGRAZIONE';

  @ValidateNested()
  @Type(() => Object)
  installationAddress: { street: string };

  @IsEnum(['FTTH', 'FTTC', 'FWA'])
  technology: 'FTTH' | 'FTTC' | 'FWA';
}

class PaymentDataDto {
  @IsOptional()
  @IsString()
  iban?: string;

  @IsOptional()
  @IsString()
  postePay?: string;

  @IsOptional()
  @IsBoolean()
  bollettino?: boolean;
}

class OldLineDataDto {
  @IsOptional()
  @IsString()
  oldPhoneNumber?: string;

  @IsOptional()
  @IsString()
  migrationCode?: string;

  @IsOptional()
  @IsString()
  gestore?: string;

  @IsOptional()
  @IsString()
  gestoreAltro?: string;

  @IsOptional()
  @IsString()
  fiscalCodeOldLine?: string;

  @IsOptional()
  @IsString()
  prodottiRestituire?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

// 🔥 NUOVO: DTO per Convergenza
class ConvergenzaDto {
  @IsBoolean()
  attiva: boolean;

  @IsOptional()
  @IsEnum(['daChiudere', 'chiusa'])
  tipo?: 'daChiudere' | 'chiusa' | null;

  @IsOptional()
  @IsString()
  numero?: string;
}

export class CreatePracticeDto {
  @IsEnum(['TIM_FIBRA', 'VODAFONE', 'WINDTRE', 'ILIAD', 'OPTIMA', 'IREN', 'SKY'])
  type: 'TIM_FIBRA' | 'VODAFONE' | 'WINDTRE' | 'ILIAD' | 'OPTIMA' | 'IREN' | 'SKY';

  @IsOptional()
  @IsString()
  offerCode?: string;

  @IsOptional()
  @IsString()
  offerName?: string;

  // Dettagli economici offerta
  @IsOptional()
  @IsString()
  offerCanone?: string;

  @IsOptional()
  @IsString()
  offerAttivazione?: string;

  @IsOptional()
  @IsString()
  offerVincolo?: string;

  @IsOptional()
  @IsString()
  offerNote?: string;

  @IsOptional()
  @IsString()
  offerDisattivazione?: string;

  @IsOptional()
  @IsString()
  offerType?: string;

  @IsOptional()
  @IsString()
  offerScadenza?: string;

  // Step 2: Operatori (ID UUID) - ORA OPZIONALI per permettere creazione allo Step 1
  @IsOptional()
  @IsUUID()
  soldById?: string;

  @IsString()
  @IsOptional()
  soldBy?: string;

  @IsOptional()
  @IsUUID()
  enteredById?: string;

  @IsString()
  @IsOptional()
  enteredBy?: string;

  // Step 3: Anagrafica + Note
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerDataDto)
  customerData?: CustomerDataDto;

  @IsOptional()
  @IsString()
  notes?: string;

  @ValidateNested()
  @Type(() => LineDataDto)
  lineData: LineDataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OldLineDataDto)
  oldLineData?: OldLineDataDto;

  @ValidateNested()
  @Type(() => PaymentDataDto)
  paymentData: PaymentDataDto;

  // Pacchetti aggiuntivi e WASH (popolati negli step successivi)
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  additionalPackages?: {
    selectedIds: string[];
    totalPrice: number;
  };

  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  washConfig?: {
    enabled: boolean;
    type: 'suspect' | 'none';
    suspectData?: {
      clientCode: string;
      action: 'disattiva' | 'mantieni';
    };
    timestamp?: Date;
  };

  // 🔥 NUOVI CAMPI
  @IsOptional()
  @ValidateNested()
  @Type(() => ConvergenzaDto)
  convergenza?: ConvergenzaDto;

  @IsOptional()
  @IsString()
  lavorazioniPostAttivazione?: string;

  @IsOptional()
  @IsEnum(['completo', 'non_completo'])
  statoGlobale?: 'completo' | 'non_completo' | null;
}