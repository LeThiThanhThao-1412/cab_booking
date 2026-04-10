// controllers/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  @Get()
  async getHealth() {
    let dbStatus = 'ok';
    
    try {
      await this.dataSource.query('SELECT 1');
    } catch (error) {
      dbStatus = 'error';
    }

    return {
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      service: 'user-service',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus,
      },
    };
  }
}