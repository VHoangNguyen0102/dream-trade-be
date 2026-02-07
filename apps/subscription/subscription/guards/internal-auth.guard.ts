import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * InternalAuthGuard - Trusts Gateway's JWT verification
 * 
 * Gateway has already verified the JWT token and checked the blacklist.
 * This guard only reads X-User-Id and X-User-Email headers injected by Gateway.
 * 
 * WARNING: This guard should ONLY be used for services behind the Gateway.
 * Direct access to these services should be blocked at network level (Docker network).
 */
@Injectable()
export class InternalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const userId = request.headers['x-user-id'] as string;
    const email = request.headers['x-user-email'] as string;

    if (!userId) {
      throw new UnauthorizedException(
        'Missing user identity. Request must go through Gateway.',
      );
    }

    // Inject user info into request object (same structure as passport)
    (request as any).user = {
      sub: userId,
      email: email || '',
    };

    return true;
  }
}
