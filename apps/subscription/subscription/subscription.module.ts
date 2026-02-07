import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '@app/database';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { Subscription, SubscriptionSchema } from './schemas/subscription.schema';
import { BillingHistory, BillingHistorySchema } from './schemas/billing-history.schema';
import { SubscriptionRepository } from './repositories/subscription.repository';
import { BillingHistoryRepository } from './repositories/billing-history.repository';
import { InternalAuthGuard } from './guards/internal-auth.guard';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: BillingHistory.name, schema: BillingHistorySchema },
    ]),
    HttpModule,
  ],
  controllers: [SubscriptionController],
  providers: [
    SubscriptionService,
    SubscriptionRepository,
    BillingHistoryRepository,
    InternalAuthGuard,
  ],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
