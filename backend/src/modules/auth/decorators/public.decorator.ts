import { SetMetadata } from '@nestjs/common';

/**
 * Marca un endpoint come pubblico: bypassa il JwtAuthGuard globale.
 * Usare SOLO su endpoint che non richiedono autenticazione (login, register, ecc.).
 *
 * Uso:
 *   @Public()
 *   @Get('login')
 *   async login(...) { ... }
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
