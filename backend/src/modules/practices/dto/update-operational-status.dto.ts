import { IsEnum, IsOptional, IsString, ValidateIf, MinLength } from 'class-validator';

export type OperationalStatusWithKo =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'ACTIVATED'
  | 'REJECTED'
  | 'KO_CREDITO'
  | 'KO_COPERTURA';

export type SkyTvStatus =
  | 'IN_LAVORAZIONE'
  | 'IN_VERIFICA_WM'
  | 'NON_SALITA_ARCADIA'
  | 'ATTIVO'
  | 'KO_GENERICO'
  | 'KO_CREDITO'
  | 'KO_COPERTURA'
  | 'KO_RINUNCIA_CLIENTE';

export class UpdateOperationalStatusDto {
  @IsEnum([
    'PENDING',
    'IN_PROGRESS',
    'ACTIVATED',
    'REJECTED',
    'KO_CREDITO',
    'KO_COPERTURA',
  ])
  status: OperationalStatusWithKo;

  @IsOptional()
  @IsEnum([
    'IN_LAVORAZIONE',
    'IN_VERIFICA_WM',
    'NON_SALITA_ARCADIA',
    'ATTIVO',
    'KO_GENERICO',
    'KO_CREDITO',
    'KO_COPERTURA',
    'KO_RINUNCIA_CLIENTE',
  ])
  skyTvStatus?: SkyTvStatus;

  @ValidateIf((o) => o.status === 'REJECTED' || o.status?.includes('KO'))
  @IsString()
  @MinLength(1, { message: 'La motivazione KO è obbligatoria per gli stati KO' })
  koReason?: string;
}
