import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { SubscriptionModule } from './subscription/subscription.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Option 1: Shared database với auth (recommended)
    // Dùng chung database 'dreamtrade' - collections sẽ tự động tạo khi có data
    DatabaseModule.forRoot(),

    // Option 2: Separate database cho subscription (uncomment nếu muốn tách)
    // DatabaseModule.forRoot({
    //   useFactory: (configService: ConfigService) => ({
    //     uri: configService.get('MONGODB_URI') || 'mongodb://localhost:27017',
    //     dbName: process.env.SUBSCRIPTION_DB_NAME || 'subscription-service',
    //   }),
    // }),

    SubscriptionModule,
  ],
})
export class AppModule { }
