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

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  async createBooking(
    @Request() req,
    @Body() createDto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    // req.user.sub là customerId từ JWT
    return this.bookingService.createBooking(req.user.sub, createDto);
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
    // Driver cập nhật vị trí
    await this.bookingService.updateLocation(id, req.user.sub, locationDto.location);
  }
}