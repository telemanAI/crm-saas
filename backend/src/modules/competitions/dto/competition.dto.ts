import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsInt,
  IsEnum,
  Min,
  ValidateNested,
  IsDateString,
  MaxLength,
  IsUUID,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TargetDto {
  @IsOptional()
  @IsUUID()
  id?: string; // se presente, edit; altrimenti nuovo

  @IsString()
  @MaxLength(200)
  label: string;

  @IsEnum(['FIXED_LINE', 'MOBILE', 'ENERGY', 'DEVICE', 'CUSTOM'])
  category: 'FIXED_LINE' | 'MOBILE' | 'ENERGY' | 'DEVICE' | 'CUSTOM';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  matchProviders?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  matchOfferKeywords?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  matchPracticeTypes?: string[];

  @IsInt()
  @Min(0)
  targetPieces: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class PrizeDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @MaxLength(200)
  label: string;

  @IsEnum(['COMPANY', 'SHOP', 'OPERATOR'])
  scope: 'COMPANY' | 'SHOP' | 'OPERATOR';

  @IsOptional()
  @IsEnum(['PIECES', 'REVENUE'])
  kind?: 'PIECES' | 'REVENUE';

  @IsOptional()
  @IsEnum(['FIXED_LINE', 'MOBILE', 'ENERGY', 'DEVICE', 'GLOBAL', 'CUSTOM'])
  category?: 'FIXED_LINE' | 'MOBILE' | 'ENERGY' | 'DEVICE' | 'GLOBAL' | 'CUSTOM';

  @IsOptional()
  @IsUUID()
  targetId?: string | null;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  threshold: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  prizeValue?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateCompetitionDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  templateKey?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TargetDto)
  targets?: TargetDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrizeDto)
  prizes?: PrizeDto[];
}

export class UpdateCompetitionDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TargetDto)
  targets?: TargetDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrizeDto)
  prizes?: PrizeDto[];
}

export class CopyCompetitionDto {
  @IsUUID()
  targetShopId: string;

  /** Se true, copia anche i targets e i prizes (default true). */
  @IsOptional()
  @IsBoolean()
  copyTargets?: boolean;

  @IsOptional()
  @IsBoolean()
  copyPrizes?: boolean;
}
