import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { GatewayController } from './gateway.controller';
import { ProxyService } from './services/proxy.service';
import { VipForAnalysisGuard } from './guards/vip-for-analysis.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule,
  ],
  controllers: [GatewayController],
  providers: [ProxyService, VipForAnalysisGuard],
})
export class AppModule {}
