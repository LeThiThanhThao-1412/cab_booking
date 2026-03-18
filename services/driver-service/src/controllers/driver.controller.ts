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


@Controller('drivers')
@UseGuards(JwtAuthGuard)
export class DriverController {
  private readonly logger = new Logger(DriverController.name);
  

  constructor(
    private readonly driverService: DriverService,
    private readonly redisService: RedisService,      // THÊM VÀO ĐÂY
    private readonly rabbitMQService: RabbitMQService  // THÊM VÀO ĐÂY
  ) {}

  @Post('rides/accept')
@UseGuards(JwtAuthGuard)
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

  // Xử lý lỗi "[object Object]"
  let bookingData;
  try {
    bookingData = typeof currentBookingRaw === 'string' 
      ? JSON.parse(currentBookingRaw) 
      : currentBookingRaw;
  } catch (e) {
    bookingData = currentBookingRaw; // Nếu parse lỗi thì dùng trực tiếp
  }

  const { bookingId } = bookingData;

  // Gửi response về matching service
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

  // Xóa cache sau khi nhận
  await redisClient.del(`driver:current:${driverId}`);

  return { 
    message: 'Đã nhận chuyến thành công',
    rideId: bookingId 
  };
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
  
  @Post('rides/reject')
@UseGuards(JwtAuthGuard)
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

  // Gửi response về matching service - ĐÚNG FORMAT
  await this.rabbitMQService.publish(
    RABBITMQ_EXCHANGES.MATCHING_EVENTS,
    ROUTING_KEYS.DRIVER_RESPONSE_REJECTED,
    {
      driverId,                    // QUAN TRỌNG: phải có driverId
      bookingId,                   // QUAN TRỌNG: phải có bookingId
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