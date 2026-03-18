import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RedisService, RabbitMQService } from '@cab-booking/shared';
import { ConfigService } from '@nestjs/config';
import { Ride, RideDocument, RideStatus } from '../schemas/ride.schema';
import { UpdateLocationDto, UpdateStatusDto, RateRideDto, RideResponseDto } from '../dto/ride.dto';
import { RideGateway } from '../gateways/ride.gateway';
import { Inject, forwardRef } from '@nestjs/common';

@Injectable()
export class RideService {
  private readonly logger = new Logger(RideService.name);
  private readonly LOCATION_EXPIRY = 3600; // 1 hour

  constructor(
    @InjectModel(Ride.name) private rideModel: Model<RideDocument>,
    private redisService: RedisService,
    private rabbitMQService: RabbitMQService,
    private configService: ConfigService,
    @Inject(forwardRef(() => RideGateway))
    private rideGateway: RideGateway,
  ) {
    //this.subscribeToEvents();
  }
  async onModuleInit() {
    try {
      await this.subscribeToEvents();
      this.logger.log('✅ RideService RabbitMQ subscriptions initialized');
    } catch (error) {
      this.logger.error(`❌ Failed to initialize RabbitMQ subscriptions: ${error.message}`);
    }
  }
  async subscribeToEvents() {
    // Lắng nghe event booking.accepted từ booking-service
    await this.rabbitMQService.subscribe(
      'ride-service.queue',
      async (msg: any) => {
        await this.handleBookingAccepted(msg);
      },
      {
        exchange: 'booking.events',
        routingKey: 'booking.accepted',
      },
    );

    // Lắng nghe event payment.completed từ payment-service
    await this.rabbitMQService.subscribe(
      'ride-service.queue',
      async (msg: any) => {
        await this.handlePaymentCompleted(msg);
      },
      {
        exchange: 'payment.events',
        routingKey: 'payment.completed',
      },
    );

    this.logger.log('✅ Subscribed to events');
  }

  async handleBookingAccepted(event: any) {
    this.logger.log(`Processing booking.accepted event: ${JSON.stringify(event)}`);

    try {
      // 1. Dữ liệu thực tế thường nằm trực tiếp trong event hoặc trong event.data
      const payload = event.data || event;

      // 2. Bóc tách dữ liệu (Lưu ý: Booking Service gửi 'id', không phải 'bookingId')
      const {
        id,                // Đây chính là ID của booking
        bookingId,         // Dự phòng nếu bookingService gửi field này
        customerId,
        driverId,
        pickupLocation,
        dropoffLocation,
        waypoints,
        estimatedPrice,
        distance,
      } = payload;

      // 3. Xác định ID cuối cùng (Tránh lỗi Missing bookingId)
      const finalBookingId = bookingId || id;

      // 4. Kiểm tra dữ liệu bắt buộc
      if (!finalBookingId || !pickupLocation || !dropoffLocation) {
        this.logger.error(`❌ Missing fields - ID: ${finalBookingId}, Pickup: ${!!pickupLocation}, Dropoff: ${!!dropoffLocation}`);
        return;
      }

      // 5. Tạo và lưu Ride
      const ride = new this.rideModel({
        bookingId: finalBookingId,
        customerId,
        driverId,
        pickupLocation,
        dropoffLocation,
        waypoints: waypoints || [],
        price: estimatedPrice || { total: 0, currency: 'VND' },
        distance: distance || 0,
        status: RideStatus.EN_ROUTE_TO_PICKUP,
        driverAcceptedAt: new Date(),
        trackingPath: [],
      });

      await ride.save();
      this.logger.log(`✅ Ride created successfully: ${ride._id}`);

      // 6. Thông báo cho các bên
      await this.rabbitMQService.publish('ride.events', 'ride.created', {
        rideId: ride._id.toString(),
        bookingId: finalBookingId,
        customerId,
        driverId,
        status: ride.status,
        timestamp: new Date().toISOString(),
      });

      this.rideGateway.sendToUser(customerId, 'ride:created', {
        rideId: ride._id.toString(),
        driverId,
        status: ride.status,
      });

    } catch (error: any) {
      this.logger.error(`Error handling booking.accepted: ${error.message}`);
    }
  }

  // Tìm trong ride.service.ts hàm xử lý payment
async handlePaymentCompleted(event: any) {
  const data = event.data || event;
  // Lỗi của bạn là do bóc tách sai ID ở đây
  const bookingId = data.bookingId; 
  
  const ride = await this.rideModel.findOne({ bookingId });
  if (ride) {
    ride.isPaid = true;
    await ride.save();
    this.logger.log(`✅ Ride ${ride._id} marked as paid`);
  } else {
    this.logger.warn(`⚠️ Could not find ride for booking ${bookingId} to mark as paid`);
  }
}

  async getRideById(rideId: string): Promise<RideResponseDto> {
    const ride = await this.rideModel.findById(rideId);
    if (!ride) {
      throw new NotFoundException('Ride not found');
    }
    return this.mapToResponse(ride);
  }

  async getActiveRideByDriver(driverId: string): Promise<RideResponseDto | null> {
    const ride = await this.rideModel.findOne({
      driverId,
      status: { $in: [RideStatus.EN_ROUTE_TO_PICKUP, RideStatus.ARRIVED_AT_PICKUP, RideStatus.IN_PROGRESS] },
    }).sort({ createdAt: -1 });

    return ride ? this.mapToResponse(ride) : null;
  }

  async getActiveRideByCustomer(customerId: string): Promise<RideResponseDto | null> {
    const ride = await this.rideModel.findOne({
      customerId,
      status: { $in: [RideStatus.EN_ROUTE_TO_PICKUP, RideStatus.ARRIVED_AT_PICKUP, RideStatus.IN_PROGRESS] },
    }).sort({ createdAt: -1 });

    return ride ? this.mapToResponse(ride) : null;
  }

  async updateLocation(
    rideId: string,
    driverId: string,
    locationDto: UpdateLocationDto,
  ): Promise<void> {
    // Kiểm tra ride và quyền của driver
    const ride = await this.rideModel.findOne({
      _id: rideId,
      driverId,
      status: { $in: [RideStatus.EN_ROUTE_TO_PICKUP, RideStatus.ARRIVED_AT_PICKUP, RideStatus.IN_PROGRESS] },
    });

    if (!ride) {
      throw new NotFoundException('Active ride not found for this driver');
    }

    // 1. Lưu location vào Redis (cho real-time query)
    const locationKey = `ride:${rideId}:location`;
    await this.redisService.getClient().setex(
      locationKey,
      this.LOCATION_EXPIRY,
      JSON.stringify({
        ...locationDto,
        timestamp: new Date().toISOString(),
      }),
    );

    // 2. Lưu tracking point vào MongoDB
    const trackingPoint = {
      ...locationDto,
      timestamp: new Date(),
    };

    await this.rideModel.findByIdAndUpdate(rideId, {
      $push: { trackingPath: trackingPoint },
    });

    // 3. Broadcast location qua WebSocket cho customer
    this.rideGateway.broadcastLocationToRide(rideId, {
      ...locationDto,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(`📍 Driver ${driverId} updated location for ride ${rideId}`);
  }

  async updateStatus(
    rideId: string,
    userId: string,
    role: string,
    updateDto: UpdateStatusDto,
  ): Promise<RideResponseDto> {
    const ride = await this.rideModel.findById(rideId);
    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    // ABAC: Kiểm tra quyền dựa trên role và trạng thái
    if (role === 'driver' && ride.driverId !== userId) {
      throw new BadRequestException('You are not the driver of this ride');
    }
    if (role === 'customer' && ride.customerId !== userId) {
      throw new BadRequestException('You are not the customer of this ride');
    }

    // Customer chỉ được hủy ride khi chưa bắt đầu
    if (role === 'customer' && updateDto.status !== 'cancelled') {
      throw new BadRequestException('Customer can only cancel ride');
    }

    const oldStatus = ride.status;
    const newStatus = updateDto.status as RideStatus;

    // Validate status transition
    this.validateStatusTransition(oldStatus, newStatus, role);

    // Update status và timestamps
    switch (newStatus) {
      case RideStatus.EN_ROUTE_TO_PICKUP:
        // Đã được set từ lúc tạo
        break;
      case RideStatus.ARRIVED_AT_PICKUP:
        ride.driverArrivedAt = new Date();
        break;
      case RideStatus.IN_PROGRESS:
        ride.rideStartedAt = new Date();
        break;
      case RideStatus.COMPLETED:
        ride.rideCompletedAt = new Date();
        // Tính duration thực tế
        if (ride.rideStartedAt) {
          const duration = Math.round((new Date().getTime() - ride.rideStartedAt.getTime()) / 60000);
          ride.duration = duration;
        }
        break;
      case RideStatus.CANCELLED:
        ride.cancellation = {
          cancelledBy: role === 'customer' ? 'customer' : role === 'driver' ? 'driver' : 'system',
          reason: updateDto.reason || 'No reason provided',
          cancelledAt: new Date(),
        };
        break;
    }

    ride.status = newStatus;
    await ride.save();

    // Publish event
    await this.rabbitMQService.publish(
      'ride.events',
      `ride.${newStatus}`,
      {
        rideId: ride._id.toString(),
        bookingId: ride.bookingId,
        customerId: ride.customerId,
        driverId: ride.driverId,
        oldStatus,
        newStatus,
        timestamp: new Date().toISOString(),
      },
    );

    // Broadcast status change
    this.rideGateway.broadcastStatusChange(rideId, newStatus, {
      oldStatus,
      ...(newStatus === RideStatus.COMPLETED && { price: ride.price }),
    });

    // Nếu hoàn thành, trigger payment
    if (newStatus === RideStatus.COMPLETED) {
      await this.triggerPayment(ride);
    }

    return this.mapToResponse(ride);
  }

  async rateRide(
    rideId: string,
    userId: string,
    role: string,
    rateDto: RateRideDto,
  ): Promise<RideResponseDto> {
    const ride = await this.rideModel.findById(rideId);
    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    if (ride.status !== RideStatus.COMPLETED) {
      throw new BadRequestException('Can only rate completed rides');
    }

    const update: any = {};
    if (role === 'customer' && ride.customerId === userId) {
      update['rating.customerRating'] = rateDto.rating;
      update['rating.customerFeedback'] = rateDto.feedback;
    } else if (role === 'driver' && ride.driverId === userId) {
      update['rating.driverRating'] = rateDto.rating;
      update['rating.driverFeedback'] = rateDto.feedback;
    } else {
      throw new BadRequestException('You are not authorized to rate this ride');
    }

    await this.rideModel.findByIdAndUpdate(rideId, { $set: update });
    
    // Publish rating event
    await this.rabbitMQService.publish(
      'ride.events',
      'ride.rated',
      {
        rideId,
        customerId: ride.customerId,
        driverId: ride.driverId,
        rating: rateDto.rating,
        role,
        timestamp: new Date().toISOString(),
      },
    );

    return this.getRideById(rideId);
  }

  async getDriverRides(driverId: string, page: number = 1, limit: number = 10): Promise<any> {
    const skip = (page - 1) * limit;
    
    const [rides, total] = await Promise.all([
      this.rideModel
        .find({ driverId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.rideModel.countDocuments({ driverId }),
    ]);

    return {
      data: rides.map(r => this.mapToResponse(r)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCustomerRides(customerId: string, page: number = 1, limit: number = 10): Promise<any> {
    const skip = (page - 1) * limit;
    
    const [rides, total] = await Promise.all([
      this.rideModel
        .find({ customerId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.rideModel.countDocuments({ customerId }),
    ]);

    return {
      data: rides.map(r => this.mapToResponse(r)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCurrentLocation(rideId: string): Promise<any> {
    const locationKey = `ride:${rideId}:location`;
    const location = await this.redisService.getClient().get(locationKey);
    return location ? JSON.parse(location) : null;
  }

  private async triggerPayment(ride: RideDocument) {
    // Publish event để payment service xử lý
    await this.rabbitMQService.publish(
      'payment.events',
      'payment.requested',
      {
        rideId: ride._id.toString(),
        bookingId: ride.bookingId,
        customerId: ride.customerId,
        driverId: ride.driverId,
        amount: ride.price.total,
        currency: ride.price.currency,
        timestamp: new Date().toISOString(),
      },
    );
  }

  private validateStatusTransition(oldStatus: RideStatus, newStatus: RideStatus, role: string) {
    const validTransitions: Record<RideStatus, RideStatus[]> = {
      [RideStatus.PENDING]: [RideStatus.EN_ROUTE_TO_PICKUP, RideStatus.CANCELLED],
      [RideStatus.EN_ROUTE_TO_PICKUP]: [RideStatus.ARRIVED_AT_PICKUP, RideStatus.CANCELLED],
      [RideStatus.ARRIVED_AT_PICKUP]: [RideStatus.IN_PROGRESS, RideStatus.CANCELLED],
      [RideStatus.IN_PROGRESS]: [RideStatus.COMPLETED],
      [RideStatus.COMPLETED]: [],
      [RideStatus.CANCELLED]: [],
    };
    
    if (!validTransitions[oldStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${oldStatus} to ${newStatus}`,
      );
    }

    // Driver không thể hủy khi đang in_progress
    if (role === 'driver' && oldStatus === RideStatus.IN_PROGRESS && newStatus === RideStatus.CANCELLED) {
      throw new BadRequestException('Driver cannot cancel ride while in progress');
    }
  }

  private mapToResponse(ride: RideDocument): RideResponseDto {
    const obj = ride.toObject();
    return {
      id: (obj._id as any).toString(),
      bookingId: obj.bookingId,
      customerId: obj.customerId,
      driverId: obj.driverId,
      pickupLocation: obj.pickupLocation,
      dropoffLocation: obj.dropoffLocation,
      waypoints: obj.waypoints,
      status: obj.status,
      price: obj.price,
      distance: obj.distance,
      duration: obj.duration,
      driverAcceptedAt: obj.driverAcceptedAt,
      driverArrivedAt: obj.driverArrivedAt,
      rideStartedAt: obj.rideStartedAt,
      rideCompletedAt: obj.rideCompletedAt,
      trackingPath: obj.trackingPath,
      cancellation: obj.cancellation,
      isPaid: obj.isPaid,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    };
  }
}