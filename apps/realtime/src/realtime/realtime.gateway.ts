import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { RealtimeService } from './realtime.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(private readonly realtimeService: RealtimeService) {}

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
    
    // Pass server instance to service
    this.realtimeService.setServer(this.server);
    
    // Initialize Redis Pub/Sub
    this.realtimeService.initialize();
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() topics: string[],
  ) {
    this.logger.log(`Client ${client.id} subscribing to: ${topics.join(', ')}`);
    topics.forEach((topic) => client.join(topic));
    return { event: 'subscribed', topics };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() topics: string[],
  ) {
    this.logger.log(`Client ${client.id} unsubscribing from: ${topics.join(', ')}`);
    topics.forEach((topic) => client.leave(topic));
    return { event: 'unsubscribed', topics };
  }

  @SubscribeMessage('message')
  handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    this.logger.log(`Message from ${client.id}:`, data);
    return { event: 'message', data: 'Message received' };
  }
}
