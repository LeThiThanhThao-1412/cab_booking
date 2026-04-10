// controllers/internal.controller.ts
import { 
  Controller, 
  Get, 
  Param,
  Query, 
  UseGuards,
  Logger
} from '@nestjs/common';
import { InternalAuthGuard } from '@cab-booking/shared';
import { DriverService } from '../services/driver.service';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RedisService } from '@cab-booking/shared';

@Controller('internal')
export class InternalController {
  private readonly logger = new Logger(InternalController.name);

  constructor(
    private readonly driverService: DriverService,
    @InjectDataSource()
    private dataSource: DataSource,
    private redisService: RedisService,
  ) {}

  @Get('health')
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
      this.logger.error(`PostgreSQL health check failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Check Redis
    try {
      const redisClient = this.redisService.getClient();
      await redisClient.ping();
      checks.redis = 'ok';
    } catch (error) {
      checks.redis = 'error';
      overallStatus = 'degraded';
      this.logger.error(`Redis health check failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Check online drivers count (optional)
    try {
      const onlineCount = await this.driverService.getOnlineDriversCount();
      checks.onlineDrivers = onlineCount;
    } catch (error) {
      checks.onlineDrivers = 'error';
    }

    return {
      status: overallStatus,
      service: 'driver-service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  @Get('drivers/nearby')
  @UseGuards(InternalAuthGuard)
  async getNearbyDrivers(
    @Query('lat') latitude: number,
    @Query('lng') longitude: number,
    @Query('radius') radius?: number,
  ) {
    this.logger.log(`Internal: Finding nearby drivers at (${latitude}, ${longitude})`);
    
    try {
      const drivers = await this.driverService.findNearbyDrivers(
        latitude, 
        longitude, 
        radius ? parseInt(radius as any) : 5000
      );
      
      this.logger.log(`Found ${drivers.length} nearby drivers`);
      return drivers;
    } catch (error) {
      this.logger.error(`Error in findNearbyDrivers: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  @Get('drivers/:userId')
  @UseGuards(InternalAuthGuard)
  async getDriver(@Param('userId') userId: string) {
    try {
      const driver = await this.driverService.getDriverByUserId(userId);
      return driver;
    } catch (error) {
      this.logger.error(`Error getting driver ${userId}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  @Get('drivers/online/count')
  @UseGuards(InternalAuthGuard)
  async getOnlineDriversCount() {
    const count = await this.driverService.getOnlineDriversCount();
    return { count };
  }

  @Get('drivers/:userId/online')
  @UseGuards(InternalAuthGuard)
  async isDriverOnline(@Param('userId') userId: string) {
    const online = await this.driverService.isDriverOnline(userId);
    return { online };
  }
}