import { 
  Controller, 
  Post, 
  Get, 
  Patch, 
  Body, 
  Param, 
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BookingService } from '../services/booking.service';
import { 
  CreateBookingDto, 
  AcceptBookingDto, 
  UpdateStatusDto,
  UpdateLocationDto,
  BookingResponseDto,
} from '../dto/booking.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { InternalAuthGuard } from '@cab-booking/shared/dist/guards/internal-auth.guard';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  async createBooking(
    @Request() req,
    @Body() createDto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    // Lấy token từ header để gọi Pricing Service
    const authHeader = req.headers.authorization;
    return this.bookingService.createBooking(req.user.sub, createDto, authHeader);
  }

  @Get()
  async getMyBookings(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('role') role?: string,
  ) {
    if (req.user.role === 'driver') {
      return this.bookingService.getDriverBookings(req.user.sub, page, limit);
    }
    return this.bookingService.getCustomerBookings(req.user.sub, page, limit);
  }

  @Get(':id')
  async getBooking(
    @Request() req,
    @Param('id') id: string,
  ): Promise<BookingResponseDto> {
    return this.bookingService.getBooking(id, req.user.sub, req.user.role);
  }

  @Patch(':id/accept')
  async acceptBooking(
    @Param('id') id: string,
    @Body() acceptDto: AcceptBookingDto,
  ): Promise<BookingResponseDto> {
    return this.bookingService.acceptBooking(id, acceptDto);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateStatusDto,
  ): Promise<BookingResponseDto> {
    return this.bookingService.updateStatus(id, updateDto);
  }

  @Patch(':id/location')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateLocation(
    @Request() req,
    @Param('id') id: string,
    @Body() locationDto: UpdateLocationDto,
  ): Promise<void> {
    await this.bookingService.updateLocation(id, req.user.sub, locationDto.location);
  }

  @Patch(':id/assign-driver')
  @UseGuards(InternalAuthGuard)
  async assignDriver(
    @Param('id') id: string,
    @Body() body: { driverId: string },
  ) {
    return this.bookingService.assignDriver(id, body.driverId);
  }

  @Patch(':id/no-driver')
  @UseGuards(InternalAuthGuard)
  async noDriverFound(@Param('id') id: string) {
    return this.bookingService.updateStatus(id, { status: 'no_driver' });
  }
}