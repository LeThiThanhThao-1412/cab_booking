// controllers/internal.controller.ts
import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller('internal')
export class InternalController {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  @Get('health')
  async getHealth() {
    let dbStatus = 'ok';
    
    // Kiểm tra kết nối database
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