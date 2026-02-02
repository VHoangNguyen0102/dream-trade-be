import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Request } from 'express';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class VipForAnalysisGuard implements CanActivate {
  private readonly logger = new Logger(VipForAnalysisGuard.name);

  private readonly subscriptionServiceUrl =
    process.env.SUBSCRIPTION_SERVICE_URL || 'http://localhost:3006';

  constructor(private readonly httpService: HttpService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    const cookieHeader = request.headers.cookie;

    if (!authHeader && !cookieHeader) {
      throw new UnauthorizedException('Authentication required');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    try {
      const url = `${this.subscriptionServiceUrl}/subscriptions/me`;
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers,
          validateStatus: () => true,
        }),
      );

      if (response.status === 401) {
        throw new UnauthorizedException(
          response.data?.message || 'Invalid or expired token',
        );
      }

      if (response.status !== 200) {
        this.logger.warn(
          `Subscription service returned ${response.status} for /subscriptions/me`,
        );
        throw new ServiceUnavailableException(
          'Unable to verify subscription. Please try again later.',
        );
      }

      const plan = response.data?.plan;
      if (plan !== 'vip') {
        throw new ForbiddenException(
          'AI analysis is for VIP users only. Please upgrade your subscription.',
        );
      }

      return true;
    } catch (error: unknown) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }
      this.logger.error(
        `VipForAnalysisGuard: subscription check failed`,
        error instanceof Error ? error.message : String(error),
      );
      throw new ServiceUnavailableException(
        'Unable to verify subscription. Please try again later.',
      );
    }
  }
}
