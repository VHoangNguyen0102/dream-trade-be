import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { createClient, RedisClientType } from 'redis';
import { TokenBlacklist } from '../schemas/token-blacklist.schema';

@Injectable()
export class TokenBlacklistService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private redisClient: RedisClientType;
  private isRedisConnected = false;

  constructor(
    @InjectModel(TokenBlacklist.name)
    private readonly blacklistModel: Model<TokenBlacklist>,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.redisClient = createClient({ url: redisUrl });
      this.redisClient.on('error', (err) => {
        this.logger.error('Redis Client Error:', err.message);
        this.isRedisConnected = false;
      });
      await this.redisClient.connect();
      this.isRedisConnected = true;
      this.logger.log('✅ Redis connected for token blacklist');
    } catch (error) {
      this.logger.warn('⚠️ Redis not available for token blacklist, using MongoDB only');
      this.isRedisConnected = false;
    }
  }

  async onModuleDestroy() {
    if (this.redisClient && this.isRedisConnected) {
      await this.redisClient.quit();
    }
  }

  async addToBlacklist(token: string, userId: string): Promise<void> {
    try {
      // Decode token để lấy thời gian hết hạn thực
      const decoded = this.jwtService.decode(token) as { exp: number };

      // Nếu token có exp (expiration time), dùng nó
      // Nếu không có (hoặc lỗi), mặc định 7 ngày cho refresh token
      const expiresAt = decoded?.exp
        ? new Date(decoded.exp * 1000) // JWT exp tính bằng giây
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 ngày

      // Lưu vào MongoDB (persistent)
      const blacklistEntry = new this.blacklistModel({
        token,
        userId,
        expiresAt,
      });
      await blacklistEntry.save();

      // Lưu vào Redis (fast lookup cho Gateway)
      if (this.isRedisConnected) {
        const ttlSeconds = Math.max(
          Math.floor((expiresAt.getTime() - Date.now()) / 1000),
          1,
        );
        await this.redisClient.setEx(
          `blacklist:${token}`,
          ttlSeconds,
          userId,
        );
      }
    } catch (error) {
      // Nếu không decode được, vẫn lưu với thời gian mặc định
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const blacklistEntry = new this.blacklistModel({
        token,
        userId,
        expiresAt,
      });
      await blacklistEntry.save();

      if (this.isRedisConnected) {
        const ttlSeconds = 7 * 24 * 60 * 60; // 7 days
        await this.redisClient.setEx(
          `blacklist:${token}`,
          ttlSeconds,
          userId,
        ).catch(() => {});
      }
    }
  }

  async isBlacklisted(token: string): Promise<boolean> {
    // Check Redis first (fast)
    if (this.isRedisConnected) {
      try {
        const exists = await this.redisClient.exists(`blacklist:${token}`);
        if (exists) return true;
      } catch {
        // Fallback to MongoDB
      }
    }
    // Fallback to MongoDB
    const entry = await this.blacklistModel.findOne({ token }).exec();
    return !!entry;
  }

  async cleanExpired(): Promise<void> {
    // MongoDB TTL index will automatically delete expired tokens
    // Redis keys also auto-expire via TTL
    // This method is for manual cleanup if needed
    await this.blacklistModel.deleteMany({
      expiresAt: { $lt: new Date() },
    });
  }
}
