// controllers/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly connection: Connection,
  ) {}

  @Get()
  async getHealth() {
    const checks: any = {};
    let overallStatus = 'ok';

    // Check MongoDB
    try {
      const state = this.connection.readyState;
      if (state === 1) {
        checks.mongodb = 'ok';
      } else {
        checks.mongodb = 'connecting';
        overallStatus = 'degraded';
      }
    } catch (error) {
      checks.mongodb = 'error';
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      service: 'notification-service',
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}