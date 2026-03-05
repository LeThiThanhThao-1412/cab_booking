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
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  // Driver phải login
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req): Promise<DriverResponseDto> {
    return this.driverService.getDriverByUserId(req.user.sub);
  }

  // Driver phải login
  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(
    @Request() req,
    @Body() updateDto: UpdateDriverDto,
  ): Promise<DriverResponseDto> {
    return this.driverService.updateDriver(req.user.sub, updateDto);
  }

  // Driver phải login
  @UseGuards(JwtAuthGuard)
  @Patch('location')
  async updateLocation(
    @Request() req,
    @Body() locationDto: DriverLocationDto,
  ): Promise<{ message: string }> {
    await this.driverService.updateLocation(req.user.sub, locationDto);
    return { message: 'Location updated successfully' };
  }

  // Driver phải login
  @UseGuards(JwtAuthGuard)
  @Patch('status')
  async updateStatus(
    @Request() req,
    @Body() statusDto: UpdateStatusDto,
  ): Promise<DriverResponseDto> {
    return this.driverService.updateStatus(req.user.sub, statusDto.status);
  }

  // PUBLIC API
  @Get('nearby')
  async findNearbyDrivers(
    @Query('lat') latitude: number,
    @Query('lng') longitude: number,
    @Query('radius') radius?: number,
  ) {
    return this.driverService.findNearbyDrivers(
      Number(latitude),
      Number(longitude),
      radius ? Number(radius) : 5000,
    );
  }
}