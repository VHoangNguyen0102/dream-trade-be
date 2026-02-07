import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SubscriptionRepository } from './repositories/subscription.repository';
import { BillingHistoryRepository } from './repositories/billing-history.repository';
import { Subscription, SubscriptionPlan, SubscriptionStatus } from './schemas/subscription.schema';
import { BillingHistory, BillingStatus } from './schemas/billing-history.schema';

export interface PlanFeature {
  id: string;
  name: string;
  included: boolean;
}

export interface PricingPlan {
  id: SubscriptionPlan;
  name: string;
  price: number;
  priceDisplay: string;
  description: string;
  features: PlanFeature[];
  popular?: boolean;
  ctaText: string;
}

export interface SubscriptionInfo {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: string;
  endDate?: string;
  renewalDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingHistoryItem {
  id: string;
  date: string;
  amount: number;
  currency: string;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  plan: SubscriptionPlan;
}

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  // Hardcoded pricing plans (matching FE mock data)
  private readonly pricingPlans: PricingPlan[] = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      priceDisplay: '$0/month',
      description: 'Perfect for getting started with crypto trading',
      features: [
        { id: 'market-data', name: 'Real-time market data', included: true },
        { id: 'basic-charts', name: 'Basic trading charts', included: true },
        { id: 'watchlist', name: 'Watchlist (up to 10 coins)', included: true },
        { id: 'news-feed', name: 'News feed', included: true },
        { id: 'ai-forecast', name: 'AI Forecast', included: false },
        { id: 'advanced-charts', name: 'Advanced charting tools', included: false },
        { id: 'priority-support', name: 'Priority support', included: false },
      ],
      ctaText: 'Get Started',
    },
    {
      id: 'vip',
      name: 'VIP',
      price: 29.99,
      priceDisplay: '$29.99/month',
      description: 'Unlock advanced features and AI-powered insights',
      features: [
        { id: 'market-data', name: 'Real-time market data', included: true },
        { id: 'basic-charts', name: 'Basic trading charts', included: true },
        { id: 'watchlist', name: 'Unlimited watchlist', included: true },
        { id: 'news-feed', name: 'News feed', included: true },
        { id: 'ai-forecast', name: 'AI Forecast', included: true },
        { id: 'advanced-charts', name: 'Advanced charting tools', included: true },
        { id: 'priority-support', name: 'Priority support', included: true },
      ],
      popular: true,
      ctaText: 'Upgrade to VIP',
    },
  ];

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly billingHistoryRepository: BillingHistoryRepository,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Get user subscription, create free plan if not exists
   */
  async getUserSubscription(userId: string): Promise<SubscriptionInfo> {
    let subscription = await this.subscriptionRepository.findByUserId(userId);

    if (!subscription) {
      // Create default free subscription
      this.logger.log(`Creating default free subscription for user ${userId}`);
      subscription = await this.subscriptionRepository.createSubscription(
        userId,
        'free',
        new Date(),
      );
    }

    return this.mapSubscriptionToInfo(subscription);
  }

  /**
   * Check if user is VIP
   */
  async isVip(userId: string): Promise<boolean> {
    const subscription = await this.subscriptionRepository.findActiveByUserId(userId);
    return subscription?.plan === 'vip' && subscription?.status === 'active';
  }

  /**
   * Get available pricing plans
   */
  getAvailablePlans(): PricingPlan[] {
    return this.pricingPlans;
  }

  /**
   * Get plan by ID
   */
  getPlanById(planId: string): PricingPlan | undefined {
    return this.pricingPlans.find(plan => plan.id === planId);
  }

  /**
   * Upgrade user to VIP
   */
  async upgradeToVip(userId: string): Promise<SubscriptionInfo> {
    // Check if user already has active VIP
    const existing = await this.subscriptionRepository.findActiveByUserId(userId);
    if (existing?.plan === 'vip' && existing?.status === 'active') {
      throw new BadRequestException('User already has an active VIP subscription');
    }

    // Calculate dates
    const now = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);
    const renewalDate = new Date(endDate);

    // Upgrade subscription
    const subscription = await this.subscriptionRepository.upgradeToVip(
      userId,
      endDate,
      renewalDate,
    );

    // Create billing history record (mock payment - auto completed)
    const vipPlan = this.getPlanById('vip');
    if (vipPlan) {
      await this.billingHistoryRepository.createBillingRecord(
        userId,
        subscription.id,
        vipPlan.price,
        'USD',
        `VIP Subscription - ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        'completed',
        'vip',
        now,
      );
      this.logger.log(`Created billing record for VIP upgrade: user ${userId}`);
    }

    this.logger.log(`User ${userId} upgraded to VIP`);

    // Sync account type to Auth Service
    await this.syncAccountType(userId, 'vip');

    return this.mapSubscriptionToInfo(subscription);
  }

  /**
   * Cancel subscription (downgrade to free)
   */
  async cancelSubscription(userId: string): Promise<SubscriptionInfo> {
    // Check if user has active subscription
    const existing = await this.subscriptionRepository.findActiveByUserId(userId);
    if (!existing) {
      throw new BadRequestException('No active subscription found to cancel');
    }

    const subscription = await this.subscriptionRepository.cancelSubscription(userId);
    this.logger.log(`User ${userId} cancelled subscription`);

    // Sync account type to Auth Service
    await this.syncAccountType(userId, 'free');

    return this.mapSubscriptionToInfo(subscription);
  }

  /**
   * Sync account type to Auth Service via internal API
   */
  private async syncAccountType(userId: string, accountType: 'free' | 'vip'): Promise<void> {
    try {
      const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:3005';
      await firstValueFrom(
        this.httpService.patch(
          `${authServiceUrl}/auth/internal/account-type/${userId}`,
          { accountType },
        ),
      );
      this.logger.log(`Synced accountType=${accountType} to Auth Service for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to sync accountType to Auth Service: ${error.message}`);
      // Don't throw - subscription change should still succeed even if sync fails
    }
  }

  /**
   * Get billing history for user
   */
  async getBillingHistory(userId: string): Promise<BillingHistoryItem[]> {
    const history = await this.billingHistoryRepository.findByUserId(userId);
    return history.map(item => this.mapBillingToItem(item));
  }

  /**
   * Map Subscription document to SubscriptionInfo DTO
   */
  private mapSubscriptionToInfo(subscription: Subscription): SubscriptionInfo {
    return {
      id: subscription.id,
      userId: subscription.userId,
      plan: subscription.plan,
      status: subscription.status,
      startDate: subscription.startDate.toISOString(),
      endDate: subscription.endDate?.toISOString(),
      renewalDate: subscription.renewalDate?.toISOString(),
      createdAt: subscription.createdAt.toISOString(),
      updatedAt: subscription.updatedAt.toISOString(),
    };
  }

  /**
   * Map BillingHistory document to BillingHistoryItem DTO
   */
  private mapBillingToItem(billing: BillingHistory): BillingHistoryItem {
    return {
      id: billing.id,
      date: billing.date.toISOString(),
      amount: billing.amount,
      currency: billing.currency,
      description: billing.description,
      status: billing.status,
      plan: billing.plan,
    };
  }
}
