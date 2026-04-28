import { 
  Controller, 
  Get, 
  Patch, 
  Post,
  Body, 
  UseGuards,
  Request,
  Query,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DriverService } from '../services/driver.service';
import { UpdateDriverDto, DriverLocationDto, UpdateStatusDto, DriverResponseDto } from '../dto/driver.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RABBITMQ_EXCHANGES, RabbitMQService, RedisService, ROUTING_KEYS } from '@cab-booking/shared';
import axios from 'axios';

@Controller('drivers')
@UseGuards(JwtAuthGuard)
export class DriverController {
  private readonly logger = new Logger(DriverController.name);

  constructor(
    private readonly driverService: DriverService,
    private readonly redisService: RedisService,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  @Post('rides/accept')
  async acceptRide(
    @Request() req,
    @Body() body: { eta?: number }
  ) {
    const driverId = req.user.sub;
    this.logger.log(`Driver ${driverId} accepting current ride`);

    const redisClient = this.redisService.getClient();
    const currentBookingRaw = await redisClient.get(`driver:current:${driverId}`);
    
    if (!currentBookingRaw) {
      throw new BadRequestException('Không tìm thấy yêu cầu cuốc xe hoặc đã hết hạn!');
    }

    const bookingData = typeof currentBookingRaw === 'string' 
      ? JSON.parse(currentBookingRaw) 
      : currentBookingRaw;

    const { bookingId } = bookingData;

    await this.rabbitMQService.publish(
      RABBITMQ_EXCHANGES.MATCHING_EVENTS,
      ROUTING_KEYS.DRIVER_RESPONSE_ACCEPTED,
      {
        driverId,
        bookingId,
        accepted: true,
        eta: body.eta || 5,
        timestamp: new Date().toISOString()
      }
    );

    await redisClient.del(`driver:current:${driverId}`);

    // ============ CHỜ RIDE ĐƯỢC TẠO VÀ LẤY RIDE ID ============
    const rideId = await this.waitForRideCreation(driverId, bookingId);

    return { 
      message: 'Đã nhận chuyến thành công',
      bookingId: bookingId,
      rideId: rideId || 'đang được tạo...',
    };
  }

  // ============ HELPER: CHỜ RIDE SERVICE TẠO RIDE ============
  private async waitForRideCreation(driverId: string, bookingId: string): Promise<string | null> {
    const rideServiceUrl = process.env.RIDE_SERVICE_URL || 'http://localhost:3005';
    const internalKey = process.env.INTERNAL_API_KEY || 'internal-key';
    const maxRetries = 15;
    const retryDelay = 300;

    for (let i = 0; i < maxRetries; i++) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      
      try {
        const response = await axios.get(
          `${rideServiceUrl}/api/v1/internal/rides/driver/${driverId}/active`,
          {
            headers: {
              'x-service-id': 'driver-service',
              'x-internal-key': internalKey,
            },
            timeout: 3000,
          }
        );
        
        const ride = response.data;
        if (ride && ride.bookingId === bookingId) {
          this.logger.log(`✅ Ride created: ${ride.id} for booking ${bookingId}`);
          return ride.id;
        }
      } catch (error) {
        this.logger.debug(`⏳ Đợi ride... (${i + 1}/${maxRetries})`);
      }
    }

    this.logger.warn(`⚠️ Không tìm thấy ride sau ${maxRetries} lần thử`);
    return null;
  }

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
  async updateOnlineStatus(
    @Request() req,
    @Body() statusDto: UpdateStatusDto,
  ): Promise<DriverResponseDto> {
    return this.driverService.updateOnlineStatus(req.user.sub, statusDto.status);
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
  
  @Post('rides/reject')
  async rejectRide(
    @Request() req,
    @Body() body: { reason?: string }
  ) {
    const driverId = req.user.sub;
    
    const redisClient = this.redisService.getClient();
    const currentBooking = await redisClient.get(`driver:current:${driverId}`);
    
    if (!currentBooking) {
      return { message: 'No pending request' };
    }

    const { bookingId } = JSON.parse(currentBooking);

    await this.rabbitMQService.publish(
      RABBITMQ_EXCHANGES.MATCHING_EVENTS,
      ROUTING_KEYS.DRIVER_RESPONSE_REJECTED,
      {
        driverId,
        bookingId,
        accepted: false,
        reason: body.reason || 'Driver không sẵn sàng',
        responseTime: Date.now(),
        timestamp: new Date().toISOString()
      }
    );

    await redisClient.del(`driver:current:${driverId}`);

    return { message: 'Đã từ chối chuyến' };
  }
}