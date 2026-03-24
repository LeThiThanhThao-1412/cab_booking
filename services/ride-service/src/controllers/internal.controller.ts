import {
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { InternalAuthGuard } from '@cab-booking/shared';
import { RideService } from '../services/ride.service';

@Controller('internal')
@UseGuards(InternalAuthGuard)
export class InternalController {
  constructor(private readonly rideService: RideService) {}

  @Get('rides/:id')
  async getRide(@Param('id') id: string) {
    return this.rideService.getRideById(id);
  }

  @Get('rides/driver/:driverId/active')
  async getDriverActiveRide(@Param('driverId') driverId: string) {
    return this.rideService.getActiveRideByDriver(driverId);
  }

  @Get('rides/customer/:customerId/active')
  async getCustomerActiveRide(@Param('customerId') customerId: string) {
    return this.rideService.getActiveRideByCustomer(customerId);
  }

  @Get('rides/:id/location')
  async getCurrentLocation(@Param('id') id: string) {
    return this.rideService.getCurrentLocation(id);
  }

  @Get('health')
  health() {
    return { status: 'ok', service: 'ride-service', timestamp: new Date().toISOString() };
  }
}