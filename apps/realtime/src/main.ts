import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for WebSocket
  app.enableCors({
    origin: '*',
    credentials: true,
  });

  const port = process.env.PORT || 3004;
  await app.listen(port);
  console.log(`🔴 Realtime Service (WebSocket) running on port ${port}`);
  console.log(`📡 WebSocket URL: ws://localhost:${port}`);
}
bootstrap();
