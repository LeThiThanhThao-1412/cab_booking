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
  BadRequestException,
  UnprocessableEntityException,
  Headers,
} from '@nestjs/common';
import { createHash } from 'crypto';
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
import { IdempotencyService } from '../idempotency/idempotency.service';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  @Post()
  async createBooking(
    @Request() req,
    @Body() createDto: CreateBookingDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<BookingResponseDto> {
    // TC11: Kiểm tra thiếu field
    if (!createDto.pickupLocation) {
      throw new BadRequestException('pickupLocation is required');
    }
    if (!createDto.dropoffLocation) {
      throw new BadRequestException('dropoffLocation is required');
    }
    if (!createDto.vehicleType) {
      throw new BadRequestException('vehicleType is required');
    }
    
    // TC12: Kiểm tra sai kiểu dữ liệu (lat/lng là string)
    if (createDto.pickupLocation) {
      if (typeof createDto.pickupLocation.lat !== 'number') {
        throw new UnprocessableEntityException('lat must be a number');
      }
      if (typeof createDto.pickupLocation.lng !== 'number') {
        throw new UnprocessableEntityException('lng must be a number');
      }
    }
    
    if (createDto.dropoffLocation) {
      if (typeof createDto.dropoffLocation.lat !== 'number') {
        throw new UnprocessableEntityException('lat must be a number');
      }
      if (typeof createDto.dropoffLocation.lng !== 'number') {
        throw new UnprocessableEntityException('lng must be a number');
      }
    }
    
    const customerId = req.user.sub;
    const authHeader = req.headers.authorization;
    
    // ========== IDEMPOTENCY LOGIC ==========
    // Tự sinh key nếu client không gửi
    let finalKey = idempotencyKey;
    if (!finalKey) {
      const hashContent = JSON.stringify({
        customerId,
        pickup: createDto.pickupLocation,
        dropoff: createDto.dropoffLocation,
        vehicle: createDto.vehicleType,
        payment: createDto.paymentMethod,
        // Đổi key mỗi phút để tránh duplicate thật sự
        minute: Math.floor(Date.now() / 60000)
      });
      finalKey = createHash('sha256').update(hashContent).digest('hex');
    }
    
    // Kiểm tra booking đã tồn tại chưa
    const existingBookingId = await this.idempotencyService.getExistingBookingId(
      customerId, 
      finalKey
    );
    
    if (existingBookingId) {
      // Trả về booking đã tồn tại
      return this.bookingService.getBookingById(existingBookingId, customerId, req.user.role);
    }
    // ======================================
    
    const newBooking = await this.bookingService.createBooking(customerId, createDto, authHeader);
    
    // Lưu idempotency record
    await this.idempotencyService.saveIdempotencyRecord(
      customerId,
      finalKey,
      newBooking.id
    );
    
    return newBooking;
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