import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { MarketModule } from './market/market.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(
      process.env.MARKET_MONGODB_URI || 
      process.env.MONGODB_URI || 
      'mongodb://localhost:27017/market-service',
    ),
    ScheduleModule.forRoot(),
    MarketModule,
  ],
})
export class AppModule {}
