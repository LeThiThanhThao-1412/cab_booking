// controllers/internal.controller.ts
import {
  Controller,
  Post,
  Get,  // THÊM Get
  Body,
  UseGuards,
} from '@nestjs/common';
import { InternalAuthGuard } from '@cab-booking/shared';
import { NotificationService } from '../services/notification.service';
import { CreateNotificationDto } from '../dto/notification.dto';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Controller('internal')
export class InternalController {
  constructor(
    private readonly notificationService: NotificationService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  // QUAN TRỌNG: Đổi từ @Post sang @Get cho health check
  @Get('health')
  async getHealth() {
    const checks: any = {};
    let overallStatus = 'ok';

    // Check MongoDB
    try {
      const state = this.connection.readyState;
      // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
      if (state === 1) {
        checks.mongodb = 'ok';
      } else {
        checks.mongodb = 'error';
        overallStatus = 'degraded';
      }
    } catch (error) {
      checks.mongodb = 'error';
      overallStatus = 'degraded';
    }

    // Check RabbitMQ (optional - có thể thêm sau)
    checks.rabbitmq = 'ok';

    // Check Redis (optional - có thể thêm sau)
    checks.redis = 'ok';

    return {
      status: overallStatus,
      service: 'notification-service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  @Post('send')
  @UseGuards(InternalAuthGuard)
  async sendNotification(@Body() dto: CreateNotificationDto) {
    return this.notificationService.createNotification(dto);
  }

  // Giữ lại POST health để tương thích ngược (optional)
  @Post('health')
  async postHealth() {
    return this.getHealth();
  }
}