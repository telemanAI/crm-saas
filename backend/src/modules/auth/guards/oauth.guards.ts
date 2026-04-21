import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Estende l'AuthGuard di Google per propagare il parametro `invite` attraverso
 * il flusso OAuth usando lo `state` standard di OAuth2 (viene restituito
 * integro dal provider nel callback).
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext): any {
    const req = context.switchToHttp().getRequest();
    const invite = req.query?.invite;
    return invite ? { state: `invite:${invite}` } : {};
  }
}

@Injectable()
export class FacebookAuthGuard extends AuthGuard('facebook') {
  getAuthenticateOptions(context: ExecutionContext): any {
    const req = context.switchToHttp().getRequest();
    const invite = req.query?.invite;
    return invite ? { state: `invite:${invite}` } : {};
  }
}