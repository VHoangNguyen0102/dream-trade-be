import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModule } from '@app/database';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { User, UserSchema } from './schemas/user.schema';
import { UserSession, UserSessionSchema } from './schemas/user-session.schema';
import { TokenBlacklist, TokenBlacklistSchema } from './schemas/token-blacklist.schema';
import { UserService } from './services/user.service';
import { UserSessionService } from './services/user-session.service';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { UserRepository } from './repositories/user.repository';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserSession.name, schema: UserSessionSchema },
      { name: TokenBlacklist.name, schema: TokenBlacklistSchema },
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '1h' },
      }),
    }),
  ],
  providers: [AuthService, UserService, UserSessionService, TokenBlacklistService, UserRepository, LocalStrategy, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, UserService],
})
export class AuthModule {}
