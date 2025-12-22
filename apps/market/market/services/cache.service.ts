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
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    try {
      const redisUrl =
        this.configService.get<string>('REDIS_URL') ||
        'redis://localhost:6379';

      this.logger.log(`Connecting to Redis: ${redisUrl.replace(/:[^:@]+@/, ':****@')}`);

      // Parse URL to check if TLS is needed
      const url = new URL(redisUrl);
      const isTLS = url.protocol === 'rediss:' || url.port === '6380';

      this.redisClient = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              this.logger.error('Redis reconnection failed after 10 retries');
              return new Error('Redis connection failed');
            }
            const delay = Math.min(retries * 100, 3000);
            this.logger.log(`Retrying Redis connection in ${delay}ms... (attempt ${retries})`);
            return delay;
          },
          connectTimeout: 10000,
          // Enable TLS for cloud Redis services
          ...(isTLS && {
            tls: true,
            rejectUnauthorized: false, // Allow self-signed certificates
          }),
        },
      });

      this.redisClient.on('error', (err) => {
        this.logger.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.redisClient.on('connect', () => {
        this.logger.log('Connecting to Redis...');
      });

      this.redisClient.on('ready', () => {
        this.logger.log('✅ Redis connected and ready');
        this.isConnected = true;
      });

      this.redisClient.on('reconnecting', () => {
        this.logger.warn('Redis reconnecting...');
      });

      await this.redisClient.connect();
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
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
}

