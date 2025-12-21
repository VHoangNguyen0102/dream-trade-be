import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MarketController } from './market.controller';
import { MarketService } from './market.service';
import { PriceRepository } from './repositories/price.repository';
import { Price, PriceSchema } from './schemas/price.schema';
import { BinanceProvider } from './providers/binance.provider';
import { CacheService } from './services/cache.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Price.name, schema: PriceSchema }]),
  ],
  controllers: [MarketController],
  providers: [
    MarketService,
    PriceRepository,
    BinanceProvider, // Adapter Pattern - easy to add OKXProvider, CoinbaseProvider later
    CacheService, // Redis cache service
  ],
  exports: [MarketService],
})
export class MarketModule {}
