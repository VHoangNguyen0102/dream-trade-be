import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Request } from 'express';
import { firstValueFrom } from 'rxjs';

/**
 * VipForAnalysisGuard - Checks if user has VIP subscription
 * 
 * NOTE: This guard runs AFTER GatewayAuthGuard (global guard),
 * so JWT is already verified and X-User-Id is injected into headers.
 * This guard only checks the subscription plan.
 */
@Injectable()
export class VipForAnalysisGuard implements CanActivate {
  private readonly logger = new Logger(VipForAnalysisGuard.name);

  private readonly subscriptionServiceUrl =
    process.env.SUBSCRIPTION_SERVICE_URL || 'http://localhost:3006';

  constructor(private readonly httpService: HttpService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // User info already verified and injected by GatewayAuthGuard
    const userId = request.headers['x-user-id'] as string;
    if (!userId) {
      throw new ForbiddenException('User identity not found');
    }

    try {
      // Call Subscription Service with X-User-Id header (no JWT needed internally)
      const url = `${this.subscriptionServiceUrl}/subscriptions/me`;
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId,
            'x-user-email': request.headers['x-user-email'] as string || '',
          },
          validateStatus: () => true,
        }),
      );

      if (response.status !== 200) {
        this.logger.warn(
          `Subscription service returned ${response.status} for user ${userId}`,
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
