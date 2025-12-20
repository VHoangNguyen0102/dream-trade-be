import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { UserService } from './user.service';

interface GoogleUserInfo {
  email: string;
  firstName: string;
  lastName: string;
  avatar: string;
  googleId: string;
  emailVerified: boolean;
}

@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);
  private googleClient: OAuth2Client;

  constructor(private readonly userService: UserService) {
    // Initialize Google OAuth Client
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      this.logger.warn('GOOGLE_CLIENT_ID is not set in environment variables');
    }
    this.googleClient = new OAuth2Client(clientId);
  }

  /**
   * Verify Google ID Token and extract user information
   * @param idToken - Google ID Token from frontend
   * @returns User information from Google
   */
  async verifyGoogleToken(idToken: string): Promise<GoogleUserInfo> {
    try {
      this.logger.log('Verifying Google ID Token...');

      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      if (!payload) {
        this.logger.error('Failed to get payload from Google token');
        throw new UnauthorizedException('Invalid Google token');
      }

      this.logger.log(`Google token verified for email: ${payload.email}`);

      // Extract user information from Google payload
      const firstName = payload.given_name || '';
      const lastName = payload.family_name || '';

      return {
        email: payload.email || '',
        firstName,
        lastName,
        avatar: payload.picture || '',
        googleId: payload.sub || '',
        emailVerified: payload.email_verified || false,
      };
    } catch (error) {
      this.logger.error(`Failed to verify Google token: ${error.message}`);
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  /**
   * Find or create user from Google account
   * @param googleUserInfo - User information from Google
   * @returns User document
   */
  async findOrCreateUser(googleUserInfo: GoogleUserInfo) {
    this.logger.log(`Finding or creating user for Google ID: ${googleUserInfo.googleId}`);

    // First, try to find by Google ID
    let user = await this.userService.findByGoogleId(googleUserInfo.googleId);

    if (user) {
      this.logger.log(`User found by Google ID: ${user._id}`);

      // Update user info if needed (avatar, name changes, etc.)
      if (user.avatar !== googleUserInfo.avatar || user.firstName !== googleUserInfo.firstName || user.lastName !== googleUserInfo.lastName) {
        this.logger.log('Updating user information from Google...');
        user = await this.userService.updateUserInfo(user._id.toString(), {
          avatar: googleUserInfo.avatar,
          firstName: googleUserInfo.firstName,
          lastName: googleUserInfo.lastName,
        });
      }

      return user;
    }

    // If not found by Google ID, check if user exists by email
    user = await this.userService.findByEmail(googleUserInfo.email);

    if (user) {
      this.logger.log(`User found by email, linking Google account: ${user._id}`);

      // Link Google account to existing user
      user = await this.userService.linkGoogleAccount(user._id.toString(), {
        googleId: googleUserInfo.googleId,
        avatar: googleUserInfo.avatar,
        isVerified: googleUserInfo.emailVerified,
      });

      return user;
    }

    // Create new user with Google account
    this.logger.log('Creating new user with Google account...');
    user = await this.userService.createGoogleUser({
      email: googleUserInfo.email,
      firstName: googleUserInfo.firstName,
      lastName: googleUserInfo.lastName,
      googleId: googleUserInfo.googleId,
      avatar: googleUserInfo.avatar,
      isVerified: googleUserInfo.emailVerified,
    });

    this.logger.log(`New user created: ${user._id}`);
    return user;
  }
}
