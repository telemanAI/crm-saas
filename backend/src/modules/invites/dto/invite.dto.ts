import { IsEmail, IsString, IsIn, IsOptional, IsObject, MinLength } from 'class-validator';
import { MembershipPermissions } from '../../memberships/entities/user-shop-membership.entity';

export class CreateInviteDto {
  @IsEmail()
  email: string;

  @IsIn(['FOUNDER', 'ADMIN', 'OPERATOR'])
  role: 'FOUNDER' | 'ADMIN' | 'OPERATOR';

  @IsOptional()
  @IsObject()
  permissions?: MembershipPermissions;

  @IsOptional()
  @IsString()
  adminNote?: string;
}

export class AcceptInviteViaPasswordDto {
  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(2)
  firstName: string;

  @IsString()
  @MinLength(2)
  lastName: string;
}
