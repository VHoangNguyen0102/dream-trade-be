import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { GatewayController } from './gateway.controller';
import { ProxyService } from './services/proxy.service';
import { GatewayAuthGuard } from './guards/gateway-auth.guard';
import { VipForAnalysisGuard } from './guards/vip-for-analysis.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    }),
  ],
  controllers: [GatewayController],
  providers: [
    ProxyService,
    VipForAnalysisGuard,
    GatewayAuthGuard,
    // Register GatewayAuthGuard as global guard
    {
      provide: APP_GUARD,
      useExisting: GatewayAuthGuard,
    },
  ],
})
export class AppModule {}
