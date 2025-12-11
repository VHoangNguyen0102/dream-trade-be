import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from './services/user.service';
import { UserSessionService } from './services/user-session.service';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly userSessionService: UserSessionService,
  ) {}

  /**
   * Register new user
   */
  async register(registerDto: RegisterDto) {
    // Check if user exists
    const existingUser = await this.userService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Create user
    const user = await this.userService.create({
      ...registerDto,
      password: hashedPassword,
    });

    // Generate tokens
    const tokens = await this.generateTokens(user._id.toString(), user.email);

    // Create session
    await this.userSessionService.create({
      userId: user._id.toString(),
      token: tokens.refreshToken,
      deviceType: registerDto.deviceType || 'web',
      ipAddress: registerDto.ipAddress,
      userAgent: registerDto.userAgent,
    });

    return {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      ...tokens,
    };
  }

  /**
   * Login user
   */
  async login(loginDto: LoginDto) {
    // Validate user
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user._id.toString(), user.email);

    // Create session
    await this.userSessionService.create({
      userId: user._id.toString(),
      token: tokens.refreshToken,
      deviceType: loginDto.deviceType || 'web',
      ipAddress: loginDto.ipAddress,
      userAgent: loginDto.userAgent,
    });

    return {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      ...tokens,
    };
  }

  /**
   * Validate user credentials
   */
  async validateUser(email: string, password: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken);

      // Check if token is blacklisted
      const isBlacklisted = await this.tokenBlacklistService.isBlacklisted(refreshToken);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }

      // Check session
      const session = await this.userSessionService.findByToken(refreshToken);
      if (!session) {
        throw new UnauthorizedException('Invalid session');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(payload.sub, payload.email);

      // Update session
      await this.userSessionService.updateToken(session._id.toString(), tokens.refreshToken);

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Logout user
   */
  async logout(userId: string, token: string) {
    // Blacklist the token
    await this.tokenBlacklistService.addToBlacklist(token, userId);

    // Delete user sessions
    await this.userSessionService.deleteByUserId(userId);

    return { message: 'Logged out successfully' };
  }

  /**
   * Change password
   */
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(
      changePasswordDto.oldPassword,
      user.password,
    );
    if (!isOldPasswordValid) {
      throw new BadRequestException('Invalid old password');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    // Update password
    await this.userService.updatePassword(userId, hashedPassword);

    // Invalidate all sessions
    await this.userSessionService.deleteByUserId(userId);

    return { message: 'Password changed successfully. Please login again.' };
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string) {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
    };
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId: string) {
    return this.userSessionService.findByUserId(userId);
  }

  /**
   * Generate JWT tokens
   */
  private async generateTokens(userId: string, email: string) {
    const payload: JwtPayload = { sub: userId, email };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour in seconds
    };
  }
}
