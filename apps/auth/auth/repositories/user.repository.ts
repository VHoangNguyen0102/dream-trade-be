import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '@app/database';
import { User } from '../schemas/user.schema';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  protected readonly logger = new Logger(UserRepository.name);

  constructor(@InjectModel(User.name) private userModel: Model<User>) {
    super(userModel);
  }

  /**
   * Tìm user theo email (không bao gồm user đã xóa)
   * Note: Includes password field for authentication purposes
   */
  async findByEmail(email: string): Promise<User | null> {
    const query = { email, isDeleted: false };
    const user = await this.model.findOne(query).select('+password').exec();
    return user;
  }

  /**
   * Tìm user theo ID kèm password (cho change-password)
   */
  async findByIdWithPassword(id: string): Promise<User | null> {
    return this.model.findOne({ _id: id, isDeleted: false }).select('+password').exec();
  }

  /**
   * Tìm user active theo email
   */
  async findActiveByEmail(email: string): Promise<User | null> {
    return this.findOne({ email, isActive: true, isDeleted: false });
  }

  /**
   * Update last login time
   */
  async updateLastLogin(userId: string): Promise<User | null> {
    return this.updateById(userId, { lastLoginAt: new Date() });
  }

  /**
   * Soft delete user
   */
  async softDelete(userId: string): Promise<User | null> {
    return this.updateById(userId, {
      isDeleted: true,
      deletedAt: new Date(),
    });
  }

  /**
   * Tìm users với phân trang và filter
   */
  async findUsersWithPagination(
    filters: {
      isActive?: boolean;
      search?: string;
    },
    page: number = 1,
    limit: number = 10
  ) {
    const query: any = { isDeleted: false };

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters.search) {
      query.$or = [
        { email: { $regex: filters.search, $options: 'i' } },
        { firstName: { $regex: filters.search, $options: 'i' } },
        { lastName: { $regex: filters.search, $options: 'i' } },
      ];
    }

    return this.findWithPagination(query, page, limit, { createdAt: -1 });
  }

  /**
   * Tìm user theo Google ID
   */
  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.findOne({ googleId });
  }

  /**
   * Update password
   */
  async updatePassword(userId: string, hashedPassword: string): Promise<User | null> {
    return this.updateById(userId, { password: hashedPassword });
  }

  /**
   * Update user info (avatar, firstName, lastName)
   */
  async updateUserInfo(
    userId: string,
    updates: { avatar?: string; firstName?: string; lastName?: string }
  ): Promise<User | null> {
    return this.updateById(userId, updates);
  }

  /**
   * Update account type (synced with subscription service)
   */
  async updateAccountType(userId: string, accountType: 'free' | 'vip'): Promise<User | null> {
    return this.updateById(userId, { accountType });
  }

  /**
   * Link Google account to existing user
   */
  async linkGoogleAccount(
    userId: string,
    googleData: { googleId: string; avatar: string; isVerified: boolean }
  ): Promise<User | null> {
    return this.updateById(userId, googleData);
  }

  /**
   * Create user from Google OAuth
   */
  async createGoogleUser(userData: {
    email: string;
    firstName: string;
    lastName: string;
    googleId: string;
    avatar: string;
    isVerified: boolean;
  }): Promise<User> {
    return this.create({
      ...userData,
      email: userData.email.toLowerCase(),
    });
  }

  /**
   * Find all users with optional limit
   */
  async findAll(limit: number = 100): Promise<User[]> {
    return this.find({}, { limit });
  }
}
