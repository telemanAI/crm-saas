import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6, { message: 'La password deve avere almeno 6 caratteri' })
  password: string;

  @IsString()
  confirmPassword: string;

  @IsString()
  @MinLength(3)
  slug: string;
}