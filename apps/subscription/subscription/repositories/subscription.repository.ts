import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '@app/database';
import { Subscription, SubscriptionPlan, SubscriptionStatus } from '../schemas/subscription.schema';

@Injectable()
export class SubscriptionRepository extends BaseRepository<Subscription> {
  protected readonly logger = new Logger(SubscriptionRepository.name);

  constructor(@InjectModel(Subscription.name) private subscriptionModel: Model<Subscription>) {
    super(subscriptionModel);
  }

  /**
   * Tìm subscription của user (active first)
   */
  async findByUserId(userId: string): Promise<Subscription | null> {
    // Try to find active subscription first
    const active = await this.findOne({ userId, status: 'active', isDeleted: false });
    if (active) {
      return active;
    }
    // If no active, return any subscription
    return this.findOne({ userId, isDeleted: false }, null, { sort: { createdAt: -1 } });
  }

  /**
   * Tìm active subscription của user
   */
  async findActiveByUserId(userId: string): Promise<Subscription | null> {
    return this.findOne({ userId, status: 'active', isDeleted: false });
  }

  /**
   * Tạo subscription mới
   */
  async createSubscription(
    userId: string,
    plan: SubscriptionPlan,
    startDate: Date,
    endDate?: Date,
    renewalDate?: Date,
  ): Promise<Subscription> {
    return this.create({
      userId,
      plan,
      status: 'active',
      startDate,
      endDate,
      renewalDate,
    });
  }

  /**
   * Upgrade subscription to VIP
   */
  async upgradeToVip(
    userId: string,
    endDate: Date,
    renewalDate: Date,
  ): Promise<Subscription> {
    const existing = await this.findActiveByUserId(userId);
    
    if (existing) {
      // Update existing subscription
      const updated = await this.updateById(existing.id, {
        plan: 'vip',
        status: 'active',
        endDate,
        renewalDate,
        updatedAt: new Date(),
      });
      if (!updated) {
        throw new Error('Failed to update subscription');
      }
      return updated;
    } else {
      // Create new VIP subscription
      return this.createSubscription(userId, 'vip', new Date(), endDate, renewalDate);
    }
  }

  /**
   * Cancel subscription (downgrade to free)
   */
  async cancelSubscription(userId: string): Promise<Subscription> {
    const subscription = await this.findActiveByUserId(userId);
    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    const updated = await this.updateById(subscription.id, {
      plan: 'free',
      status: 'cancelled',
      updatedAt: new Date(),
    });
    if (!updated) {
      throw new BadRequestException('Failed to cancel subscription');
    }
    return updated;
  }

  /**
   * Expire subscription when end date passed
   */
  async expireSubscription(userId: string): Promise<Subscription | null> {
    const subscription = await this.findActiveByUserId(userId);
    if (!subscription || !subscription.endDate) {
      return null;
    }

    const now = new Date();
    if (subscription.endDate < now && subscription.status === 'active') {
      const updated = await this.updateById(subscription.id, {
        status: 'expired',
        updatedAt: now,
      });
      return updated || subscription;
    }

    return subscription;
  }
}
