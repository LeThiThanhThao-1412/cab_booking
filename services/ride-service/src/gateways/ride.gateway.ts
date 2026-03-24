import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RideService } from '../services/ride.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  currentRideId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/rides',
})
export class RideGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RideGateway.name);
  private userSockets: Map<string, AuthenticatedSocket[]> = new Map();
  private rideSubscribers: Map<string, Set<string>> = new Map();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(forwardRef(() => RideService))
    private rideService: RideService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth.token || 
                    client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        this.logger.warn('No token provided, disconnecting');
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      client.userId = payload.sub;
      client.userRole = payload.role;

      // Lưu socket
      const userSockets = this.userSockets.get(payload.sub) || [];
      userSockets.push(client);
      this.userSockets.set(payload.sub, userSockets);

      // Join room cá nhân
      client.join(`user:${payload.sub}`);
      client.join(`role:${payload.role}`);

      this.logger.log(`✅ Client connected: ${client.id}, userId: ${payload.sub}, role: ${payload.role}`);

      // Nếu driver đang có ride active, tự động reconnect
      if (payload.role === 'driver') {
        const activeRide = await this.rideService.getActiveRideByDriver(payload.sub);
        if (activeRide) {
          client.currentRideId = activeRide.id;
          client.join(`ride:${activeRide.id}`);
          this.logger.log(`Driver ${payload.sub} reconnected to ride ${activeRide.id}`);
        }
      }

      if (payload.role === 'customer') {
        const activeRide = await this.rideService.getActiveRideByCustomer(payload.sub);
        if (activeRide) {
          client.join(`ride:${activeRide.id}`);
          this.logger.log(`Customer ${payload.sub} reconnected to ride ${activeRide.id}`);
        }
      }

    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const userSockets = this.userSockets.get(client.userId) || [];
      const index = userSockets.indexOf(client);
      if (index > -1) userSockets.splice(index, 1);
      if (userSockets.length === 0) this.userSockets.delete(client.userId);
      this.logger.log(`❌ Client disconnected: ${client.id}, userId: ${client.userId}`);
    }
  }

  @SubscribeMessage('subscribeToRide')
  async handleSubscribeToRide(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { rideId: string },
  ) {
    if (!client.userId) throw new WsException('Unauthorized');

    const { rideId } = data;
    const ride = await this.rideService.getRideById(rideId);
    
    if (!ride) throw new WsException('Ride not found');
    if (ride.customerId !== client.userId && ride.driverId !== client.userId) {
      throw new WsException('You do not have permission');
    }

    client.join(`ride:${rideId}`);
    client.currentRideId = rideId;

    if (!this.rideSubscribers.has(rideId)) {
      this.rideSubscribers.set(rideId, new Set());
    }
    this.rideSubscribers.get(rideId)?.add(client.userId);

    this.logger.log(`User ${client.userId} subscribed to ride ${rideId}`);
    return { event: 'subscribed', data: { rideId } };
  }

  @SubscribeMessage('unsubscribeFromRide')
  handleUnsubscribeFromRide(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { rideId: string },
  ) {
    if (client.currentRideId === data.rideId) {
      client.leave(`ride:${data.rideId}`);
      client.currentRideId = undefined;
      
      const subscribers = this.rideSubscribers.get(data.rideId);
      if (subscribers && client.userId) {
        subscribers.delete(client.userId);
        if (subscribers.size === 0) this.rideSubscribers.delete(data.rideId);
      }
    }
    return { event: 'unsubscribed', data: { rideId: data.rideId } };
  }

  // Broadcast location to all subscribers of a ride
  broadcastLocationToRide(rideId: string, location: any) {
    this.server.to(`ride:${rideId}`).emit('driver:location', {
      rideId,
      location,
      timestamp: new Date().toISOString(),
    });
  }

  // Broadcast status change
  broadcastStatusChange(rideId: string, status: string, data?: any) {
    this.server.to(`ride:${rideId}`).emit('ride:status', {
      rideId,
      status,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  // Send to specific user
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return !!sockets && sockets.length > 0;
  }
}