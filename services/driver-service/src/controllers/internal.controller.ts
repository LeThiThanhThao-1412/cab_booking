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

@Controller('internal/drivers')
@UseGuards(InternalAuthGuard)
export class InternalController {
  private readonly logger = new Logger(InternalController.name);

  constructor(private readonly driverService: DriverService) {}

  @Get('nearby')
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
      this.logger.error(`Error in findNearbyDrivers: ${error.message}`);
      return []; // Trả về mảng rỗng thay vì throw error
    }
  }

  @Get(':userId')
  async getDriver(@Param('userId') userId: string) {
    try {
      const driver = await this.driverService.getDriverByUserId(userId);
      return driver;
    } catch (error) {
      this.logger.error(`Error getting driver ${userId}: ${error.message}`);
      throw error; // Giữ nguyên throw vì đây là API lấy driver cụ thể
    }
  }

  @Get('online/count')
  async getOnlineDriversCount() {
    const count = await this.driverService.getOnlineDriversCount();
    return { count };
  }

  @Get(':userId/online')
  async isDriverOnline(@Param('userId') userId: string) {
    const online = await this.driverService.isDriverOnline(userId);
    return { online };
  }
}