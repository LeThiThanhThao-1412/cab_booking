import { 
  Controller, 
  Get, 
  Patch, 
  Body, 
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { DriverService } from '../services/driver.service';
import { UpdateDriverDto, DriverLocationDto, UpdateStatusDto, DriverResponseDto } from '../dto/driver.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('drivers')
@UseGuards(JwtAuthGuard)
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Get('profile')
  async getProfile(@Request() req): Promise<DriverResponseDto> {
    return this.driverService.getDriverByUserId(req.user.sub);
  }

  @Patch('profile')
  async updateProfile(
    @Request() req,
    @Body() updateDto: UpdateDriverDto,
  ): Promise<DriverResponseDto> {
    return this.driverService.updateDriver(req.user.sub, updateDto);
  }

  @Patch('location')
  async updateLocation(
    @Request() req,
    @Body() locationDto: DriverLocationDto,
  ): Promise<{ message: string }> {
    await this.driverService.updateLocation(req.user.sub, locationDto);
    return { message: 'Location updated successfully' };
  }

  @Patch('status')
  async updateStatus(
    @Request() req,
    @Body() statusDto: UpdateStatusDto,
  ): Promise<DriverResponseDto> {
    return this.driverService.updateStatus(req.user.sub, statusDto.status);
  }

  @Get('nearby')
  async findNearbyDrivers(
    @Query('lat') latitude: number,
    @Query('lng') longitude: number,
    @Query('radius') radius?: number,
  ) {
    return this.driverService.findNearbyDrivers(
      latitude,
      longitude,
      radius ? parseInt(radius as any) : 5000,
    );
  }
}