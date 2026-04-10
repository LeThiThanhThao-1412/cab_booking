import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/notifications',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private userSockets: Map<string, AuthenticatedSocket[]> = new Map();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        this.logger.warn('No token provided');
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      client.userId = payload.sub;

      const sockets = this.userSockets.get(payload.sub) || [];
      sockets.push(client);
      this.userSockets.set(payload.sub, sockets);

      client.join(`user:${payload.sub}`);
      
      this.logger.log(`✅ Client connected: ${client.id}, userId: ${payload.sub}`);
    } catch (error) {
      this.logger.error(`Connection error: ${error instanceof Error ? error.message : String(error)}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const sockets = this.userSockets.get(client.userId) || [];
      const index = sockets.indexOf(client);
      if (index > -1) sockets.splice(index, 1);
      if (sockets.length === 0) this.userSockets.delete(client.userId);
      this.logger.log(`❌ Client disconnected: ${client.id}, userId: ${client.userId}`);
    }
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { notificationIds: string[] },
  ) {
    // Có thể gọi service để mark read
    this.logger.log(`Mark read: ${data.notificationIds}`);
  }

  sendToUser(userId: string, event: string, data: any) {
  this.server.to(`user:${userId}`).emit(event, data);
}

isUserOnline(userId: string): boolean {
  const sockets = this.userSockets.get(userId);
  return sockets ? sockets.length > 0 : false;
}
}