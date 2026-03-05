import { 
  Controller, 
  Get, 
  Param, 
  UseGuards,
} from '@nestjs/common';
import { InternalAuthGuard } from '@cab-booking/shared';
import { BookingService } from '../services/booking.service';

@Controller('internal')
@UseGuards(InternalAuthGuard)
export class InternalController {
  constructor(private readonly bookingService: BookingService) {}

  @Get('bookings/:id')
  async getBooking(@Param('id') id: string) {
    return this.bookingService.getBooking(id, '', 'internal');
  }

  @Get('customers/:customerId/bookings')
  async getCustomerBookings(@Param('customerId') customerId: string) {
    return this.bookingService.getCustomerBookings(customerId, 1, 100);
  }

  @Get('drivers/:driverId/bookings')
  async getDriverBookings(@Param('driverId') driverId: string) {
    return this.bookingService.getDriverBookings(driverId, 1, 100);
  }

  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'booking-service',
      timestamp: new Date().toISOString(),
    };
  }
}