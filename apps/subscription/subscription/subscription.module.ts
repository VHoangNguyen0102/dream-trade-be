import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { DatabaseModule } from '@app/database';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { Subscription, SubscriptionSchema } from './schemas/subscription.schema';
import { BillingHistory, BillingHistorySchema } from './schemas/billing-history.schema';
import { SubscriptionRepository } from './repositories/subscription.repository';
import { BillingHistoryRepository } from './repositories/billing-history.repository';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: BillingHistory.name, schema: BillingHistorySchema },
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '1h' },
      }),
    }),
  ],
  controllers: [SubscriptionController],
  providers: [
    SubscriptionService,
    SubscriptionRepository,
    BillingHistoryRepository,
    JwtStrategy,
    JwtAuthGuard,
  ],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
