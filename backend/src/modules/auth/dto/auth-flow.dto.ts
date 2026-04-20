
import { IsEmail, IsString, IsOptional, IsIn, MinLength } from 'class-validator';

export class RequestOtpDto {
  @IsEmail()
  email: string;
}

export class VerifyOtpDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  code: string;
}

/**
 * Completa registrazione dopo social login o OTP per NUOVO utente.
 * Contiene il pendingRegistrationToken rilasciato dal backend dopo il callback OAuth/OTP,
 * più la scelta ruolo e i dati dello shop.
 */
export class CompleteRegistrationDto {
  @IsString()
  pendingToken: string;

  @IsIn(['shop_owner', 'operator'])
  role: 'shop_owner' | 'operator';

  // Per shop_owner
  @IsOptional()
  @IsString()
  shopName?: string;

  @IsOptional()
  @IsString()
  legalName?: string; // ragione sociale

  @IsOptional()
  @IsString()
  vatNumber?: string; // P.IVA

  // Per operator: token invito ricevuto via email
  @IsOptional()
  @IsString()
  inviteToken?: string;
}

/**
 * Registrazione owner standard con password (non social).
 */
export class RegisterShopOwnerDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(2)
  firstName: string;

  @IsString()
  @MinLength(2)
  lastName: string;

  @IsString()
  @MinLength(2)
  shopName: string;

  @IsString()
  @MinLength(2)
  legalName: string;

  @IsOptional()
  @IsString()
  vatNumber?: string;

  @IsOptional()
  @IsString()
  slug?: string;
}
