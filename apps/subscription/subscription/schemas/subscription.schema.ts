import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema, baseSchemaOptions } from '@app/database';

export type SubscriptionPlan = 'free' | 'vip';
export type SubscriptionStatus = 'active' | 'inactive' | 'cancelled' | 'expired';

/**
 * Subscription Collection Schema
 * Represents user subscription plans (Free/VIP)
 */
@Schema(baseSchemaOptions)
export class Subscription extends BaseSchema {
  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({
    type: String,
    enum: ['free', 'vip'],
    default: 'free',
    required: true,
  })
  plan: SubscriptionPlan;

  @Prop({
    type: String,
    enum: ['active', 'inactive', 'cancelled', 'expired'],
    default: 'active',
    required: true,
  })
  status: SubscriptionStatus;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, required: false })
  endDate?: Date;

  @Prop({ type: Date, required: false })
  renewalDate?: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

// Indexes for performance
SubscriptionSchema.index({ userId: 1, status: 1 }); // Compound index for finding active subscriptions
SubscriptionSchema.index({ userId: 1 }, { unique: true, sparse: true, partialFilterExpression: { status: 'active' } }); // Only one active subscription per user
