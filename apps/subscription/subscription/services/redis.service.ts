import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class SubscriptionRedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(SubscriptionRedisService.name);
    private redisClient: RedisClientType;
    private isConnected = false;

    async onModuleInit() {
        try {
            const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
            this.logger.log(`Connecting to Redis: ${redisUrl.replace(/:[^:@]+@/, ':****@')}`);

            this.redisClient = createClient({ url: redisUrl });

            this.redisClient.on('error', (err) => {
                this.logger.error('Redis Client Error:', err.message);
                this.isConnected = false;
            });

            await this.redisClient.connect();
            this.isConnected = true;
            this.logger.log('✅ Redis connected for subscription events');
        } catch (error) {
            this.logger.warn('⚠️ Redis not available for subscription events');
            this.isConnected = false;
        }
    }

    async onModuleDestroy() {
        if (this.redisClient && this.isConnected) {
            await this.redisClient.quit();
            this.logger.log('Redis connection closed');
        }
    }

    /**
     * Publish account type change event to Redis channel
     * Auth service subscribes to this channel to sync account type
     */
    async publishAccountTypeChange(userId: string, accountType: 'free' | 'vip'): Promise<boolean> {
        if (!this.isConnected) {
            this.logger.warn('Redis not connected, cannot publish account type change');
            return false;
        }

        try {
            const message = JSON.stringify({ userId, accountType });
            await this.redisClient.publish('subscription:account-type-changed', message);
            this.logger.log(`Published account type change: userId=${userId}, accountType=${accountType}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to publish account type change: ${error.message}`);
            return false;
        }
    }
}
