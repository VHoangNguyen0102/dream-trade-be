import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RealtimeService {
  private server: Server;
  private redisClient: RedisClientType;
  private readonly logger = new Logger(RealtimeService.name);

  setServer(server: Server) {
    this.server = server;
  }

  async initialize() {
    try {
      // Connect to Redis for Pub/Sub
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      });

      this.redisClient.on('error', (err: any) => {
        this.logger.error('Redis Client Error:', err);
      });

      await this.redisClient.connect();
      this.logger.log('📮 Redis Pub/Sub connected');

      // Subscribe to Redis channels
      const subscriber = this.redisClient.duplicate();
      await subscriber.connect();

      await subscriber.subscribe('price_updates', (message: string) => {
        const event = JSON.parse(message);
        this.publish('price_updates', event);
      });

      await subscriber.subscribe('news_alerts', (message: string) => {
        const event = JSON.parse(message);
        this.publish('news_alerts', event);
      });

      this.logger.log('Subscribed to Redis channels: price_updates, news_alerts');
    } catch (error) {
      this.logger.error('Failed to initialize Redis:', error);
    }
  }

  publish(room: string, data: any) {
    if (this.server) {
      this.server.to(room).emit(room, data);
      this.logger.debug(`Published to ${room}:`, data);
    }
  }

  broadcast(event: string, data: any) {
    if (this.server) {
      this.server.emit(event, data);
      this.logger.debug(`Broadcast ${event}:`, data);
    }
  }

  async publishToRedis(channel: string, data: any) {
    if (this.redisClient) {
      await this.redisClient.publish(channel, JSON.stringify(data));
    }
  }
}
