import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { FakePriceGenerator } from './fake-price-generator.service';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
  providers: [RealtimeGateway, RealtimeService, FakePriceGenerator],
  exports: [RealtimeService],
})
export class RealtimeModule {}
