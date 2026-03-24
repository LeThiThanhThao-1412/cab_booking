import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { RideService } from '../services/ride.service';
import { UpdateLocationDto, UpdateStatusDto, RateRideDto, RideResponseDto } from '../dto/ride.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('rides')
@UseGuards(JwtAuthGuard)
export class RideController {
  constructor(private readonly rideService: RideService) {}

  @Get(':id')
  async getRide(@Param('id') id: string): Promise<RideResponseDto> {
    return this.rideService.getRideById(id);
  }

  @Get('driver/active')
  async getDriverActiveRide(@Request() req): Promise<RideResponseDto | null> {
    return this.rideService.getActiveRideByDriver(req.user.sub);
  }

  @Get('customer/active')
  async getCustomerActiveRide(@Request() req): Promise<RideResponseDto | null> {
    return this.rideService.getActiveRideByCustomer(req.user.sub);
  }

  @Patch(':id/location')
  async updateLocation(
    @Request() req,
    @Param('id') id: string,
    @Body() locationDto: UpdateLocationDto,
  ): Promise<{ message: string }> {
    await this.rideService.updateLocation(id, req.user.sub, locationDto);
    return { message: 'Location updated' };
  }

  @Patch(':id/status')
  async updateStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateStatusDto,
  ): Promise<RideResponseDto> {
    return this.rideService.updateStatus(id, req.user.sub, req.user.role, updateDto);
  }

  @Post(':id/rate')
  async rateRide(
    @Request() req,
    @Param('id') id: string,
    @Body() rateDto: RateRideDto,
  ): Promise<RideResponseDto> {
    return this.rideService.rateRide(id, req.user.sub, req.user.role, rateDto);
  }

  @Get('driver/:driverId')
  async getDriverRides(
    @Param('driverId') driverId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.rideService.getDriverRides(driverId, page, limit);
  }

  @Get('customer/:customerId')
  async getCustomerRides(
    @Param('customerId') customerId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.rideService.getCustomerRides(customerId, page, limit);
  }

  @Get(':id/location')
  async getCurrentLocation(@Param('id') id: string) {
    return this.rideService.getCurrentLocation(id);
  }
}