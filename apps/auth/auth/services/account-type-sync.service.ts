import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { UserService } from './user.service';

@Injectable()
export class AccountTypeSyncService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(AccountTypeSyncService.name);
    private subscriberClient: RedisClientType;
    private isConnected = false;

    constructor(private readonly userService: UserService) { }

    async onModuleInit() {
        try {
            const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
            this.logger.log(`Connecting to Redis for account type sync...`);

            this.subscriberClient = createClient({ url: redisUrl });

            this.subscriberClient.on('error', (err) => {
                this.logger.error('Redis Subscriber Error:', err.message);
                this.isConnected = false;
            });

            await this.subscriberClient.connect();
            this.isConnected = true;

            // Subscribe to account type change events from Subscription service
            await this.subscriberClient.subscribe('subscription:account-type-changed', async (message) => {
                try {
                    const { userId, accountType } = JSON.parse(message);

                    if (!userId || !accountType || !['free', 'vip'].includes(accountType)) {
                        this.logger.warn(`Invalid account type change message: ${message}`);
                        return;
                    }

                    this.logger.log(`Received account type change: userId=${userId}, accountType=${accountType}`);
                    await this.userService.updateAccountType(userId, accountType);
                    this.logger.log(`Synced accountType=${accountType} for user ${userId}`);
                } catch (error) {
                    this.logger.error(`Failed to process account type change: ${error.message}`);
                }
            });

            this.logger.log('✅ Subscribed to Redis channel: subscription:account-type-changed');
        } catch (error) {
            this.logger.warn(`⚠️ Redis subscriber not available for account type sync: ${error.message}`);
            this.isConnected = false;
        }
    }

    async onModuleDestroy() {
        if (this.subscriberClient && this.isConnected) {
            await this.subscriberClient.quit();
            this.logger.log('Redis subscriber connection closed');
        }
    }
}
