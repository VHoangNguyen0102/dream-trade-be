import { Controller, Post, Body, UseGuards, Request, Get, Logger, Res, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from '../auth_services/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { GoogleLoginDto } from '../dto/google-login.dto';
import { InternalAuthGuard } from '../guards/internal-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) { }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() registerDto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    this.logger.log(`Register request for email: ${registerDto.email}`);
    const result = await this.authService.register(registerDto);

    // Set httpOnly cookies
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    this.logger.log(`User registered successfully: ${result.user.id}`);

    // Return user info and tokens (tokens in response body for flexibility)
    return result;
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(loginDto);

    // Set httpOnly cookies
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Return user info and tokens (tokens in response body for flexibility)
    return result;
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto, @Request() req, @Res({ passthrough: true }) res: Response) {
    // Get refresh token from cookie or body (cookie has priority)
    const refreshToken = req.cookies?.refreshToken || refreshTokenDto.refreshToken;

    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required - provide via cookie or request body');
    }

    const result = await this.authService.refreshToken(refreshToken);

    // Set new httpOnly cookies
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    this.logger.log('Tokens refreshed successfully');
    this.logger.log('Result refresh token:', result);

    return result;
  }

  @Post('logout')
  @UseGuards(InternalAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and blacklist token' })
  async logout(@Request() req, @Res({ passthrough: true }) res: Response) {
    const accessToken = req.cookies?.accessToken;
    const refreshToken = req.cookies?.refreshToken;

    await this.authService.logout(req.user.sub, accessToken, refreshToken);

    // Clear cookies with same options as when they were set
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
    };

    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);

    return { message: 'Logged out successfully' };
  }

  @Post('change-password')
  @UseGuards(InternalAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.sub, changePasswordDto);
  }

  @Get('profile')
  @UseGuards(InternalAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.sub);
  }

  @Get('sessions')
  @UseGuards(InternalAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user active sessions' })
  async getSessions(@Request() req) {
    return this.authService.getUserSessions(req.user.sub);
  }

  @Post('google')
  @ApiOperation({ summary: 'Login with Google OAuth' })
  @ApiBody({ type: GoogleLoginDto })
  async googleLogin(@Body() googleLoginDto: GoogleLoginDto, @Res({ passthrough: true }) res: Response) {
    this.logger.log('Google login request received');
    const result = await this.authService.googleLogin(googleLoginDto);

    // Set httpOnly cookies for tokens
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    this.logger.log(`Google login successful for user: ${result.user.id}`);

    // Return user info and tokens (tokens in response body for flexibility)
    return result;
  }
}
