import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { TokenBlacklist } from '../schemas/token-blacklist.schema';

@Injectable()
export class TokenBlacklistService {
  constructor(
    @InjectModel(TokenBlacklist.name)
    private readonly blacklistModel: Model<TokenBlacklist>,
    private readonly jwtService: JwtService
  ) {}

  async addToBlacklist(token: string, userId: string): Promise<void> {
    try {
      // Decode token để lấy thời gian hết hạn thực
      const decoded = this.jwtService.decode(token) as { exp: number };

      // Nếu token có exp (expiration time), dùng nó
      // Nếu không có (hoặc lỗi), mặc định 7 ngày cho refresh token
      const expiresAt = decoded?.exp
        ? new Date(decoded.exp * 1000) // JWT exp tính bằng giây
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 ngày

      const blacklistEntry = new this.blacklistModel({
        token,
        userId,
        expiresAt,
      });
      await blacklistEntry.save();
    } catch (error) {
      // Nếu không decode được, vẫn lưu với thời gian mặc định
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const blacklistEntry = new this.blacklistModel({
        token,
        userId,
        expiresAt,
      });
      await blacklistEntry.save();
    }
  }

  async isBlacklisted(token: string): Promise<boolean> {
    const entry = await this.blacklistModel.findOne({ token }).exec();
    return !!entry;
  }

  async cleanExpired(): Promise<void> {
    // MongoDB TTL index will automatically delete expired tokens
    // This method is for manual cleanup if needed
    await this.blacklistModel.deleteMany({
      expiresAt: { $lt: new Date() },
    });
  }
}
