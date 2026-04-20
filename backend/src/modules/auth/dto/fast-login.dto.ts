import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

/**
 * DTO login \"fast\" — SENZA subscriptionCode obbligatorio.
 * - Utenti normali: email + password → sistema trova automaticamente lo shop dalle membership.
 * - SUPER_ADMIN: email + password + subscriptionCode (=847293516) per double-security.
 */
export class FastLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  subscriptionCode?: string;
}
