import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TokenBlacklist } from '../schemas/token-blacklist.schema';

@Injectable()
export class TokenBlacklistService {
  constructor(
    @InjectModel(TokenBlacklist.name)
    private readonly blacklistModel: Model<TokenBlacklist>,
  ) {}

  async addToBlacklist(
    token: string,
    userId: string,
    expiresIn = 3600,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    const blacklistEntry = new this.blacklistModel({
      token,
      userId,
      expiresAt,
    });
    await blacklistEntry.save();
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
