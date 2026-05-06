import {
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
  IsUUID,
  IsBoolean,
  IsObject,
} from 'class-validator';
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

  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  address?: {
    street?: string;
    number?: string;
    city?: string;
    zip?: string;
    province?: string;
  };
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
  /**
   * Categoria della pratica. Default FIXED_LINE per compat.
   * - FIXED_LINE: flusso rete fissa (9 step, richiede lineData + paymentData)
   * - MOBILE: flusso rete mobile (usa mobileData)
   * - ENERGY: flusso luce/gas (usa energyData)
   */
  @IsOptional()
  @IsEnum(['FIXED_LINE', 'MOBILE', 'ENERGY'])
  category?: 'FIXED_LINE' | 'MOBILE' | 'ENERGY';

  // Per FIXED_LINE l'enum è ristretto. Per MOBILE e ENERGY il "type" rappresenta
  // il provider (TIM, VODAFONE, ILIAD, ENEL, ENI...) come stringa libera.
  // Lato DTO accettiamo stringa opzionale: la validazione runtime sul provider
  // è gestita nel service in base alla categoria.
  @IsOptional()
  @IsString()
  type?: string;

  /**
   * UUID dell'offerta del catalogo backend (opzionale).
   * Se passato, viene salvato su practice.offerId e usato per il match
   * delle gare con `target.targetType='specific'` e `target.offerIds[]`.
   *
   * Se NON passato ma `offerName` è valorizzato, il backend tenta una
   * lookup automatica per nome+tenant come fallback.
   */
  @IsOptional()
  @IsUUID()
  offerId?: string;

  @IsOptional()
  @IsString()
  offerCode?: string;

  @IsOptional()
  @IsString()
  offerName?: string;

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

  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerDataDto)
  customerData?: CustomerDataDto;

  @IsOptional()
  @IsString()
  notes?: string;

  // Dati specifici FIXED_LINE: lineData + paymentData + oldLineData
  // Li teniamo OPZIONALI (anche per rete fissa sono popolati solo dallo step 4+).
  @IsOptional()
  @ValidateNested()
  @Type(() => LineDataDto)
  lineData?: LineDataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OldLineDataDto)
  oldLineData?: OldLineDataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentDataDto)
  paymentData?: PaymentDataDto;

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

  /**
   * Dati specifici categoria MOBILE. Struttura aperta (jsonb lato DB).
   * La validazione di dettaglio è lato frontend per mantenere flessibilità
   * su campi futuri ("Altro" con testo libero, nuove opzioni, ecc).
   */
  @IsOptional()
  @IsObject()
  mobileData?: Record<string, any>;

  /**
   * Dati specifici categoria ENERGY (luce/gas). Stessa filosofia.
   */
  @IsOptional()
  @IsObject()
  energyData?: Record<string, any>;
}
