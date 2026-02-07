import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModule } from '@app/database';
import { AuthController } from '../auth_controllers/auth.controller';
import { AuthService } from '../auth_services/auth.service';
import { User, UserSchema } from '../schemas/user.schema';
import { UserSession, UserSessionSchema } from '../schemas/user-session.schema';
import { TokenBlacklist, TokenBlacklistSchema } from '../schemas/token-blacklist.schema';
import { UserService } from '../services/user.service';
import { UserSessionService } from '../services/user-session.service';
import { TokenBlacklistService } from '../services/token-blacklist.service';
import { GoogleAuthService } from '../services/google-auth.service';
import { UserRepository } from '../repositories/user.repository';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserSession.name, schema: UserSessionSchema },
      { name: TokenBlacklist.name, schema: TokenBlacklistSchema },
    ]),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '1h' },
      }),
    }),
  ],
  providers: [AuthService, UserService, UserSessionService, TokenBlacklistService, GoogleAuthService, UserRepository],
  controllers: [AuthController],
  exports: [AuthService, UserService],
})
export class AuthModule { }
