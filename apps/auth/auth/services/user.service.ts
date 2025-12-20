import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../schemas/user.schema';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {}

  async create(userData: Partial<User>): Promise<User> {
    const user = new this.userModel(userData);
    return user.save();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).select('+password').exec();
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.userModel.findOne({ googleId }).exec();
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      password: hashedPassword,
    });
  }

  async updateUserInfo(userId: string, updates: { avatar?: string; firstName?: string; lastName?: string }): Promise<User> {
    return this.userModel.findByIdAndUpdate(userId, updates, { new: true }).exec();
  }

  async linkGoogleAccount(userId: string, googleData: { googleId: string; avatar: string; isVerified: boolean }): Promise<User> {
    return this.userModel.findByIdAndUpdate(userId, googleData, { new: true }).exec();
  }

  async createGoogleUser(userData: {
    email: string;
    firstName: string;
    lastName: string;
    googleId: string;
    avatar: string;
    isVerified: boolean;
  }): Promise<User> {
    const user = new this.userModel({
      ...userData,
      email: userData.email.toLowerCase(),
    });
    return user.save();
  }

  async findAll(limit = 100): Promise<User[]> {
    return this.userModel.find().limit(limit).exec();
  }
}
