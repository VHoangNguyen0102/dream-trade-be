import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RealtimeService } from './realtime.service';

@Injectable()
export class FakePriceGenerator implements OnModuleInit {
  private readonly logger = new Logger(FakePriceGenerator.name);
  private prices: Map<string, number> = new Map([
    ['BTCUSDT', 45000],
    ['ETHUSDT', 3000],
    ['BNBUSDT', 400],
  ]);

  constructor(private readonly realtimeService: RealtimeService) {}

  onModuleInit() {
    this.startGenerating();
  }

  private startGenerating() {
    setInterval(() => {
      this.prices.forEach((price, symbol) => {
        // Random walk: +/- 0.5%
        const change = (Math.random() - 0.5) * 0.01 * price;
        const newPrice = price + change;
        this.prices.set(symbol, newPrice);

        const priceUpdate = {
          symbol,
          price: Number(newPrice.toFixed(2)),
          timestamp: new Date().toISOString(),
        };

        // Publish to WebSocket
        this.realtimeService.publish('price_updates', priceUpdate);

        // Also publish to Redis for other services
        this.realtimeService.publishToRedis('price_updates', priceUpdate);
      });
    }, 1000); // Every 1 second

    this.logger.log('🎲 Fake price generator started (1s interval)');
  }
}
