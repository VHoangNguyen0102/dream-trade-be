import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RealtimeModule,
  ],
})
export class AppModule {}
