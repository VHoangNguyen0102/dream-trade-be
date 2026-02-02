import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema, baseSchemaOptions } from '@app/database';

export type BillingStatus = 'completed' | 'pending' | 'failed';
export type BillingPlan = 'free' | 'vip';

/**
 * Billing History Collection Schema
 * Represents payment/billing records for subscriptions
 */
@Schema(baseSchemaOptions)
export class BillingHistory extends BaseSchema {
  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ type: String, required: true, index: true })
  subscriptionId: string;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: String, default: 'USD', required: true })
  currency: string;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({
    type: String,
    enum: ['completed', 'pending', 'failed'],
    default: 'pending',
    required: true,
  })
  status: BillingStatus;

  @Prop({
    type: String,
    enum: ['free', 'vip'],
    required: true,
  })
  plan: BillingPlan;

  @Prop({ type: Date, required: true, default: Date.now })
  date: Date;
}

export const BillingHistorySchema = SchemaFactory.createForClass(BillingHistory);

// Indexes for performance
BillingHistorySchema.index({ userId: 1, date: -1 }); // For getting user billing history sorted by date
BillingHistorySchema.index({ subscriptionId: 1 }); // For finding billing records by subscription
