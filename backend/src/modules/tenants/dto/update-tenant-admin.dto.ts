import { IsEnum, IsOptional, IsObject, IsString, MinLength } from 'class-validator';

export enum TenantPlanType {
  TRIAL = 'trial',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export class UpdateTenantAdminDto {
  @IsEnum(TenantPlanType)
  plan: TenantPlanType;

  @IsOptional()
  @IsObject()
  planLimits?: {
    maxUsers?: number;
    maxCustomers?: number;
    maxStorage?: number;
    features?: string[];
  };

  @IsOptional()
  @IsString()
  @MinLength(3)
  subscriptionStatus?: string;

  @IsOptional()
  @IsObject()
  settings?: {
    theme?: string;
    language?: string;
    notifications?: boolean;
  };
}