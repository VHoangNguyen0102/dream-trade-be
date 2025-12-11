import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserSession } from '../schemas/user-session.schema';

@Injectable()
export class UserSessionService {
  constructor(
    @InjectModel(UserSession.name)
    private readonly sessionModel: Model<UserSession>,
  ) {}

  async create(sessionData: Partial<UserSession>): Promise<UserSession> {
    const session = new this.sessionModel(sessionData);
    return session.save();
  }

  async findByToken(token: string): Promise<UserSession | null> {
    return this.sessionModel.findOne({ token }).exec();
  }

  async findByUserId(userId: string): Promise<UserSession[]> {
    return this.sessionModel.find({ userId }).exec();
  }

  async updateToken(sessionId: string, newToken: string): Promise<void> {
    await this.sessionModel.findByIdAndUpdate(sessionId, {
      token: newToken,
      lastActivityAt: new Date(),
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.sessionModel.deleteMany({ userId }).exec();
  }

  async deleteById(sessionId: string): Promise<void> {
    await this.sessionModel.findByIdAndDelete(sessionId).exec();
  }
}
