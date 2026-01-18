import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '@app/database';
import { BillingHistory, BillingStatus, BillingPlan } from '../schemas/billing-history.schema';

@Injectable()
export class BillingHistoryRepository extends BaseRepository<BillingHistory> {
  protected readonly logger = new Logger(BillingHistoryRepository.name);

  constructor(@InjectModel(BillingHistory.name) private billingHistoryModel: Model<BillingHistory>) {
    super(billingHistoryModel);
  }

  /**
   * Lấy billing history của user (sort by date desc)
   */
  async findByUserId(userId: string): Promise<BillingHistory[]> {
    return this.find(
      { userId, isDeleted: false },
      null,
      { sort: { date: -1 } }
    );
  }

  /**
   * Tạo billing record mới
   */
  async createBillingRecord(
    userId: string,
    subscriptionId: string,
    amount: number,
    currency: string,
    description: string,
    status: BillingStatus,
    plan: BillingPlan,
    date?: Date,
  ): Promise<BillingHistory> {
    return this.create({
      userId,
      subscriptionId,
      amount,
      currency,
      description,
      status,
      plan,
      date: date || new Date(),
    });
  }

  /**
   * Lấy billing history theo subscription ID
   */
  async findBySubscriptionId(subscriptionId: string): Promise<BillingHistory[]> {
    return this.find(
      { subscriptionId, isDeleted: false },
      null,
      { sort: { date: -1 } }
    );
  }
}
