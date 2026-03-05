import { 
  Controller, 
  Get, 
  Param,
  Query, 
  UseGuards,
} from '@nestjs/common';
import { InternalAuthGuard } from '@cab-booking/shared';
import { DriverService } from '../services/driver.service';

@Controller('internal')
@UseGuards(InternalAuthGuard)
export class InternalController {
  constructor(private readonly driverService: DriverService) {}

  @Get('drivers/:userId')
  async getDriver(@Param('userId') userId: string) {
    return this.driverService.getDriverByUserId(userId);
  }

  @Get('drivers/nearby')
  async getNearbyDrivers(
    @Query('lat') latitude: number,
    @Query('lng') longitude: number,
    @Query('radius') radius?: number,
  ) {
    return this.driverService.findNearbyDrivers(latitude, longitude, radius);
  }

  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'driver-service',
      timestamp: new Date().toISOString(),
    };
  }
}