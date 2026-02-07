import { Injectable } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { User } from '../schemas/user.schema';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) { }

  async create(userData: Partial<User>): Promise<User> {
    return this.userRepository.create(userData);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email.toLowerCase());
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  async findByIdWithPassword(id: string): Promise<User | null> {
    return this.userRepository.findByIdWithPassword(id);
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.userRepository.findByGoogleId(googleId);
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.userRepository.updatePassword(userId, hashedPassword);
  }

  async updateUserInfo(userId: string, updates: { avatar?: string; firstName?: string; lastName?: string }): Promise<User> {
    const user = await this.userRepository.updateUserInfo(userId, updates);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async updateAccountType(userId: string, accountType: 'free' | 'vip'): Promise<User> {
    const user = await this.userRepository.updateAccountType(userId, accountType);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async linkGoogleAccount(userId: string, googleData: { googleId: string; avatar: string; isVerified: boolean }): Promise<User> {
    const user = await this.userRepository.linkGoogleAccount(userId, googleData);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async createGoogleUser(userData: {
    email: string;
    firstName: string;
    lastName: string;
    googleId: string;
    avatar: string;
    isVerified: boolean;
  }): Promise<User> {
    return this.userRepository.createGoogleUser(userData);
  }

  async findAll(limit = 100): Promise<User[]> {
    return this.userRepository.findAll(limit);
  }
}
