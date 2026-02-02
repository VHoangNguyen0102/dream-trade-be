import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

/**
 * Cache Service for Redis
 * Manages caching for Binance API responses to reduce API calls and improve performance
 */
@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redisClient: RedisClientType;
  private subscriberClient: RedisClientType;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) { }

  async onModuleInit() {
    try {
      const redisUrl =
        this.configService.get<string>('REDIS_URL') ||
        'redis://localhost:6379';

      this.logger.log(`Connecting to Redis: ${redisUrl.replace(/:[^:@]+@/, ':****@')}`);

      const url = new URL(redisUrl);
      const isTLS = url.protocol === 'rediss:' || url.port === '6380';

      const socketOptions = {
        reconnectStrategy: (retries: number) => {
          if (retries > 10) {
            this.logger.error('Redis reconnection failed after 10 retries');
            return new Error('Redis connection failed');
          }
          const delay = Math.min(retries * 100, 3000);
          this.logger.log(`Retrying Redis connection in ${delay}ms... (attempt ${retries})`);
          return delay;
        },
        connectTimeout: 10000,
        ...(isTLS && {
          tls: true,
          rejectUnauthorized: false,
        }),
      };

      this.redisClient = createClient({
        url: redisUrl,
        socket: socketOptions,
      });

      this.subscriberClient = createClient({
        url: redisUrl,
        socket: socketOptions,
      });

      this.redisClient.on('error', (err) => {
        this.logger.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.subscriberClient.on('error', (err) => {
        this.logger.error('Redis Subscriber Error:', err);
      });

      await this.redisClient.connect();
      await this.subscriberClient.connect();

      this.isConnected = true;
      this.logger.log('✅ Redis connected successfully (Client + Subscriber)');
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
      this.isConnected = false;
    }
  }

  async onModuleDestroy() {
    if (this.isConnected) {
      if (this.redisClient) {
        await this.redisClient.quit();
        this.logger.log('Redis Client connection closed');
      }
      if (this.subscriberClient) {
        await this.subscriberClient.quit();
        this.logger.log('Redis Subscriber connection closed');
      }
      this.isConnected = false;
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) {
      return null;
    }

    try {
      const value = await this.redisClient.get(key);
      if (value) {
        return JSON.parse(value) as T;
      }
      return null;
    } catch (error) {
      this.logger.error(`Failed to get cache key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key: string, value: any, ttlSeconds: number): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.redisClient.setEx(
        key,
        ttlSeconds,
        JSON.stringify(value),
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to set cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.redisClient.del(key);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const result = await this.redisClient.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to check cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get multiple keys at once
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!this.isConnected || keys.length === 0) {
      return keys.map(() => null);
    }

    try {
      const values = await this.redisClient.mGet(keys);
      return values.map((value) => (value ? (JSON.parse(value) as T) : null));
    } catch (error) {
      this.logger.error(`Failed to mget cache keys:`, error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple keys at once
   */
  async mset(
    keyValuePairs: Array<{ key: string; value: any; ttl?: number }>,
  ): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      // Use pipeline for better performance
      const pipeline = this.redisClient.multi();
      for (const { key, value, ttl } of keyValuePairs) {
        if (ttl) {
          pipeline.setEx(key, ttl, JSON.stringify(value));
        } else {
          pipeline.set(key, JSON.stringify(value));
        }
      }
      await pipeline.exec();
      return true;
    } catch (error) {
      this.logger.error(`Failed to mset cache keys:`, error);
      return false;
    }
  }

  /**
   * Push value to a Redis list (rPush)
   */
  async rPush(key: string, value: any): Promise<number | null> {
    if (!this.isConnected) {
      return null;
    }

    try {
      return await this.redisClient.rPush(key, JSON.stringify(value));
    } catch (error) {
      this.logger.error(`Failed to rPush to cache key ${key}:`, error);
      return null;
    }
  }

  /**
   * Push value to history list and trim
   */
  async pushHistory(key: string, value: any, maxItems: number = 1000): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const pipeline = this.redisClient.multi();
      pipeline.rPush(key, JSON.stringify(value));
      pipeline.lTrim(key, -maxItems, -1);
      await pipeline.exec();
      return true;
    } catch (error) {
      this.logger.error(`Failed to push history for ${key}:`, error);
      return false;
    }
  }

  /**
   * Add value to a Redis Sorted Set
   */
  async addToSortedSet(key: string, score: number, value: any): Promise<number | null> {
    if (!this.isConnected) {
      return null;
    }

    try {
      return await this.redisClient.zAdd(key, {
        score,
        value: JSON.stringify(value),
      });
    } catch (error) {
      this.logger.error(`Failed to add to sorted set ${key}:`, error);
      return null;
    }
  }

  /**
   * Get values from a Redis Sorted Set within a score range
   */
  async getSortedSetRange(
    key: string,
    min: number | string,
    max: number | string,
  ): Promise<any[]> {
    if (!this.isConnected) {
      return [];
    }

    try {
      const results = await this.redisClient.zRangeByScore(key, min, max);
      return results.map((item) => JSON.parse(item));
    } catch (error) {
      this.logger.error(`Failed to get range from sorted set ${key}:`, error);
      return [];
    }
  }

  /**
   * Trim Sorted Set to keep only recent items
   */
  async trimSortedSet(key: string, maxItems: number): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const count = await this.redisClient.zCard(key);
      if (count > maxItems) {
        await this.redisClient.zRemRangeByRank(key, 0, count - maxItems - 1);
      }
      return true;
    } catch (error) {
      this.logger.error(`Failed to trim sorted set ${key}:`, error);
      return false;
    }
  }

  /**
   * Publish message to a Redis channel
   */
  async publish(channel: string, message: any): Promise<number | null> {
    if (!this.isConnected) {
      return null;
    }

    try {
      return await this.redisClient.publish(channel, JSON.stringify(message));
    } catch (error) {
      this.logger.error(`Failed to publish to channel ${channel}:`, error);
      return null;
    }
  }

  /**
   * Subscribe to a Redis channel
   */
  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    let retries = 0;
    while (!this.isConnected && retries < 5) {
      this.logger.log(`Waiting for Redis connection to subscribe to ${channel}... (attempt ${retries + 1})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      retries++;
    }

    if (!this.isConnected) {
      this.logger.warn(`Cannot subscribe to ${channel}: Redis not connected after retries`);
      return;
    }

    try {
      await this.subscriberClient.subscribe(channel, (message) => {
        this.logger.debug(`Received message on channel ${channel}`);
        callback(message);
      });
      this.logger.log(`Subscribed to Redis channel: ${channel}`);
    } catch (error) {
      this.logger.error(`Failed to subscribe to channel ${channel}:`, error);
    }
  }
}

