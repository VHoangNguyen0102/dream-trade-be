import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { createClient, RedisClientType } from 'redis';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

interface JwtPayload {
  sub: string;
  email: string;
  exp: number;
}

@Injectable()
export class GatewayAuthGuard implements CanActivate {
  private readonly logger = new Logger(GatewayAuthGuard.name);
  private redisClient: RedisClientType;
  private isRedisConnected = false;

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {
    this.initRedis();
  }

  private async initRedis() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.redisClient = createClient({ url: redisUrl });
      this.redisClient.on('error', (err) => {
        this.logger.error('Redis error:', err.message);
        this.isRedisConnected = false;
      });
      await this.redisClient.connect();
      this.isRedisConnected = true;
      this.logger.log('✅ Redis connected for Gateway auth');
    } catch (error) {
      this.logger.warn('⚠️ Redis not available for Gateway auth');
      this.isRedisConnected = false;
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // Extract token from cookie or Authorization header
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      // 1. Verify JWT signature + expiration
      const payload = this.jwtService.verify<JwtPayload>(token);

      // 2. Check if token is blacklisted in Redis
      if (this.isRedisConnected) {
        const isBlacklisted = await this.redisClient.exists(`blacklist:${token}`);
        if (isBlacklisted) {
          throw new UnauthorizedException('Token has been revoked');
        }
      }

      // 3. Inject user info into request headers for downstream services
      request.headers['x-user-id'] = payload.sub;
      request.headers['x-user-email'] = payload.email;

      // Also store on request object for guards that run after (e.g., VipGuard)
      (request as any).user = { sub: payload.sub, email: payload.email };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(request: Request): string | null {
    // Priority: Cookie > Authorization header
    const cookieToken = request.cookies?.accessToken;
    if (cookieToken) {
      return cookieToken;
    }

    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }
}
