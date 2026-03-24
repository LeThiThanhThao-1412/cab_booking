import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RedisService, RabbitMQService } from '@cab-booking/shared';
import { ConfigService } from '@nestjs/config';
import { Ride, RideDocument, RideStatus } from '../schemas/ride.schema';
import { UpdateLocationDto, UpdateStatusDto, RateRideDto, RideResponseDto } from '../dto/ride.dto';
import { RideGateway } from '../gateways/ride.gateway';

@Injectable()
export class RideService implements OnModuleInit {
  private readonly logger = new Logger(RideService.name);
  private readonly LOCATION_EXPIRY = 3600; // 1 hour
  private isSubscribed = false;

  constructor(
    @InjectModel(Ride.name) private rideModel: Model<RideDocument>,
    private redisService: RedisService,
    private rabbitMQService: RabbitMQService,
    private configService: ConfigService,
    @Inject(forwardRef(() => RideGateway))
    private rideGateway: RideGateway,
  ) {}

  async onModuleInit() {
    await new Promise(resolve => setTimeout(resolve, 3000));
    await this.subscribeWithRetry();
  }

  async subscribeWithRetry(retryCount = 0) {
    const maxRetries = 10;
    const retryDelay = 5000;

    if (this.isSubscribed) {
      this.logger.log('Already subscribed to events');
      return;
    }

    try {
      await this.subscribeToEvents();
      this.isSubscribed = true;
      this.logger.log('✅ Successfully subscribed to events');
    } catch (error) {
      if (retryCount < maxRetries) {
        this.logger.warn(`Failed to subscribe to events (attempt ${retryCount + 1}/${maxRetries}): ${error.message}`);
        setTimeout(() => this.subscribeWithRetry(retryCount + 1), retryDelay);
      } else {
        this.logger.error(`Failed to subscribe to events after ${maxRetries} attempts.`);
      }
    }
  }

  async subscribeToEvents() {
    try {
      const channel = this.rabbitMQService['channel'];
      if (!channel) {
        throw new Error('RabbitMQ channel is not available');
      }

      this.logger.log('Subscribing to booking.accepted events...');
      
      await this.rabbitMQService.subscribe(
        'ride-service.queue',
        async (msg: any) => {
          this.logger.debug(`Received message: ${JSON.stringify(msg)}`);
          await this.handleBookingAccepted(msg);
        },
        {
          exchange: 'booking.events',
          routingKey: 'booking.accepted',
        },
      );

      this.logger.log('✅ Subscribed to booking.accepted events');
    } catch (error) {
      this.logger.error(`Failed to subscribe: ${error.message}`);
      throw error;
    }
  }

  async handleBookingAccepted(event: any) {
    this.logger.log(`Processing booking.accepted: ${JSON.stringify(event)}`);

    try {
      const data = event.data || event;
      const { 
        bookingId, 
        customerId, 
        driverId, 
        pickupLocation, 
        dropoffLocation, 
        distance, 
        eta,
        price 
      } = data;

      this.logger.log(`📦 Price from event: ${JSON.stringify(price)}`);

      const existingRide = await this.rideModel.findOne({ bookingId });
      if (existingRide) {
        this.logger.warn(`Ride already exists for booking ${bookingId}`);
        return;
      }

      let ridePrice;
      
      if (price && typeof price === 'object' && price.total) {
        ridePrice = {
          basePrice: price.basePrice || 0,
          distancePrice: price.distancePrice || 0,
          timePrice: price.timePrice || 0,
          surgeMultiplier: price.surgeMultiplier || 1,
          total: price.total,
          currency: price.currency || 'VND'
        };
        this.logger.log(`✅ Using price from event: ${ridePrice.total} ${ridePrice.currency}`);
      } else {
        this.logger.warn(`⚠️ No valid price in event, calculating default price`);
        const basePrice = 20000;
        const pricePerKm = 10000;
        const pricePerMinute = 2000;
        const dist = distance || 5.2;
        const estimatedDuration = Math.round(dist * 2);
        
        ridePrice = {
          basePrice: basePrice,
          distancePrice: Math.round(dist * pricePerKm),
          timePrice: Math.round(estimatedDuration * pricePerMinute),
          surgeMultiplier: 1,
          total: Math.round(basePrice + (dist * pricePerKm) + (estimatedDuration * pricePerMinute)),
          currency: 'VND'
        };
        this.logger.log(`✅ Using calculated price: ${ridePrice.total} ${ridePrice.currency}`);
      }

      const ride = new this.rideModel({
        bookingId,
        customerId,
        driverId,
        pickupLocation,
        dropoffLocation,
        price: ridePrice,
        distance: distance || 0,
        status: RideStatus.EN_ROUTE_TO_PICKUP,
        estimatedDuration: eta || 5,
        driverAcceptedAt: new Date(),
        trackingPath: [],
      });

      await ride.save();

      const savedRide = await this.rideModel.findById(ride._id);
      this.logger.log(`💾 Saved ride price: ${JSON.stringify(savedRide?.price)}`);
      this.logger.log(`✅ Ride created: ${ride._id} with price: ${ridePrice.total} ${ridePrice.currency}`);

      await this.rabbitMQService.publish(
        'ride.events',
        'ride.created',
        {
          rideId: ride._id.toString(),
          bookingId,
          customerId,
          driverId,
          status: ride.status,
          price: ridePrice,
          timestamp: new Date().toISOString(),
        },
      ).catch(error => {
        this.logger.error(`Failed to publish ride.created: ${error.message}`);
      });

      try {
        this.rideGateway.sendToUser(customerId, 'ride:created', {
          rideId: ride._id.toString(),
          driverId,
          status: ride.status,
          eta: eta || 5,
          price: ridePrice,
          message: 'Tài xế đang trên đường đến đón bạn',
        });

        this.rideGateway.sendToUser(driverId, 'ride:assigned', {
          rideId: ride._id.toString(),
          customerId,
          pickupLocation,
          dropoffLocation,
          price: ridePrice,
        });
      } catch (error) {
        this.logger.error(`Failed to send WebSocket: ${error.message}`);
      }

    } catch (error) {
      this.logger.error(`Error handling booking.accepted: ${error.message}`);
      this.logger.error(error.stack);
    }
  }

  async getRideById(rideId: string): Promise<RideResponseDto> {
    const ride = await this.rideModel.findById(rideId);
    if (!ride) throw new NotFoundException('Ride not found');
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
    const ride = await this.rideModel.findOne({
      _id: rideId,
      driverId,
      status: { $in: [RideStatus.EN_ROUTE_TO_PICKUP, RideStatus.ARRIVED_AT_PICKUP, RideStatus.IN_PROGRESS] },
    });

    if (!ride) {
      throw new NotFoundException('Active ride not found');
    }

    const locationKey = `ride:${rideId}:location`;
    await this.redisService.getClient().setex(
      locationKey,
      this.LOCATION_EXPIRY,
      JSON.stringify({ ...locationDto, timestamp: new Date().toISOString() }),
    );

    await this.rideModel.findByIdAndUpdate(rideId, {
      $push: { trackingPath: { ...locationDto, timestamp: new Date() } },
    });

    this.rideGateway.broadcastLocationToRide(rideId, locationDto);
    this.logger.debug(`📍 Driver ${driverId} updated location for ride ${rideId}`);
  }

  async updateStatus(
    rideId: string,
    userId: string,
    role: string,
    updateDto: UpdateStatusDto,
  ): Promise<RideResponseDto> {
    const ride = await this.rideModel.findById(rideId);
    if (!ride) throw new NotFoundException('Ride not found');

    if (role === 'driver' && ride.driverId !== userId) {
      throw new BadRequestException('You are not the driver');
    }
    if (role === 'customer' && ride.customerId !== userId && updateDto.status !== 'cancelled') {
      throw new BadRequestException('You can only cancel the ride');
    }

    const oldStatus = ride.status;
    const newStatus = updateDto.status as RideStatus;

    this.validateStatusTransition(oldStatus, newStatus, role);

    switch (newStatus) {
      case RideStatus.ARRIVED_AT_PICKUP:
        ride.driverArrivedAt = new Date();
        break;
      case RideStatus.IN_PROGRESS:
        ride.rideStartedAt = new Date();
        break;
      case RideStatus.COMPLETED:
        ride.rideCompletedAt = new Date();
        if (ride.rideStartedAt) {
          const duration = Math.round((new Date().getTime() - ride.rideStartedAt.getTime()) / 60000);
          ride.duration = duration;
        }
        break;
      case RideStatus.CANCELLED:
        ride.cancellation = {
          cancelledBy: role as any,
          reason: updateDto.reason || 'No reason provided',
          cancelledAt: new Date(),
        };
        break;
    }

    ride.status = newStatus;
    await ride.save();

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
    ).catch(error => {
      this.logger.error(`Failed to publish ride.${newStatus}: ${error.message}`);
    });

    this.rideGateway.broadcastStatusChange(rideId, newStatus, { oldStatus });

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
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.status !== RideStatus.COMPLETED) {
      throw new BadRequestException('Can only rate completed rides');
    }

    const update: any = {};
    if (role === 'customer' && ride.customerId === userId) {
      update['rating.customerRating'] = rateDto.rating;
      update['rating.customerFeedback'] = rateDto.feedback;
      this.logger.log(`Customer ${userId} rated ride ${rideId}: ${rateDto.rating} stars`);
    } else if (role === 'driver' && ride.driverId === userId) {
      update['rating.driverRating'] = rateDto.rating;
      update['rating.driverFeedback'] = rateDto.feedback;
      this.logger.log(`Driver ${userId} rated ride ${rideId}: ${rateDto.rating} stars`);
    } else {
      throw new BadRequestException('Unauthorized');
    }

    await this.rideModel.findByIdAndUpdate(rideId, { $set: update });
    
    await this.rabbitMQService.publish(
      'ride.events',
      'ride.rated',
      {
        rideId,
        rating: rateDto.rating,
        role,
        feedback: rateDto.feedback,
        timestamp: new Date().toISOString(),
      },
    ).catch(error => {
      this.logger.error(`Failed to publish ride.rated: ${error.message}`);
    });

    // Trả về ride đã cập nhật với rating
    return this.getRideById(rideId);
  }

  async getDriverRides(driverId: string, page: number = 1, limit: number = 10): Promise<any> {
    const skip = (page - 1) * limit;
    const [rides, total] = await Promise.all([
      this.rideModel.find({ driverId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
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
      this.rideModel.find({ customerId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
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
    try {
      if (!ride.price) {
        this.logger.error(`Ride ${ride._id} has no price object`);
        return;
      }
      
      if (!ride.price.total) {
        this.logger.error(`Ride ${ride._id} has no total price. Price: ${JSON.stringify(ride.price)}`);
        return;
      }

      this.logger.log(`💰 Triggering payment for ride ${ride._id}: ${ride.price.total} ${ride.price.currency}`);

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
          priceDetails: ride.price,
          timestamp: new Date().toISOString(),
        },
      );
      this.logger.log(`✅ Payment requested for ride ${ride._id}`);
    } catch (error) {
      this.logger.error(`Failed to trigger payment for ride ${ride._id}: ${error.message}`);
    }
  }

  private validateStatusTransition(oldStatus: RideStatus, newStatus: RideStatus, role: string) {
    const transitions: Record<RideStatus, RideStatus[]> = {
      [RideStatus.PENDING]: [RideStatus.EN_ROUTE_TO_PICKUP, RideStatus.CANCELLED],
      [RideStatus.EN_ROUTE_TO_PICKUP]: [RideStatus.ARRIVED_AT_PICKUP, RideStatus.CANCELLED],
      [RideStatus.ARRIVED_AT_PICKUP]: [RideStatus.IN_PROGRESS, RideStatus.CANCELLED],
      [RideStatus.IN_PROGRESS]: [RideStatus.COMPLETED],
      [RideStatus.COMPLETED]: [],
      [RideStatus.CANCELLED]: [],
    };

    if (!transitions[oldStatus]?.includes(newStatus)) {
      throw new BadRequestException(`Invalid transition from ${oldStatus} to ${newStatus}`);
    }

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
      estimatedDuration: obj.estimatedDuration,
      estimatedDistance: obj.estimatedDistance,
      driverAcceptedAt: obj.driverAcceptedAt,
      driverArrivedAt: obj.driverArrivedAt,
      rideStartedAt: obj.rideStartedAt,
      rideCompletedAt: obj.rideCompletedAt,
      trackingPath: obj.trackingPath,
      cancellation: obj.cancellation,
      isPaid: obj.isPaid,
      rating: obj.rating ? {
        customerRating: obj.rating.customerRating,
        driverRating: obj.rating.driverRating,
        customerFeedback: obj.rating.customerFeedback,
        driverFeedback: obj.rating.driverFeedback
      } : undefined,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    };
  }
}