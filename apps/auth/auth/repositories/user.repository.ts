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
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ email, isDeleted: false });
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
}
