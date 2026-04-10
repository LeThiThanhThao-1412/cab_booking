// controllers/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RedisService } from '@cab-booking/shared';

@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    private redisService: RedisService,
  ) {}

  @Get()
  async getHealth() {
    const checks: any = {};
    let overallStatus = 'ok';

    // Check PostgreSQL
    try {
      await this.dataSource.query('SELECT 1');
      checks.postgres = 'ok';
    } catch (error) {
      checks.postgres = 'error';
      overallStatus = 'degraded';
    }

    // Check Redis
    try {
      const redisClient = this.redisService.getClient();
      await redisClient.ping();
      checks.redis = 'ok';
    } catch (error) {
      checks.redis = 'error';
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      service: 'driver-service',
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}