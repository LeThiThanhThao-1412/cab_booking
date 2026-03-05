import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RedisService, RabbitMQService } from '@cab-booking/shared';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CreateBookingDto, AcceptBookingDto, UpdateStatusDto, BookingResponseDto } from '../dto/booking.dto';
import { Booking, BookingDocument, BookingStatus, VehicleType } from '../schemas/booking.schema';


@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);
  private readonly NEARBY_RADIUS = 5000; // 5km

  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    private redisService: RedisService,
    private rabbitMQService: RabbitMQService,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  async createBooking(customerId: string, createDto: CreateBookingDto): Promise<BookingResponseDto> {
    this.logger.log(`Creating booking for customer: ${customerId}`);

    // 1. Tính giá dự kiến
    const estimatedPrice = await this.calculatePrice(
      createDto.distance,
      createDto.duration || 0,
      createDto.vehicleType,
    );

    // 2. Tạo booking trong MongoDB
    const booking = new this.bookingModel({
      customerId,
      pickupLocation: createDto.pickupLocation,
      dropoffLocation: createDto.dropoffLocation,
      waypoints: createDto.waypoints || [],
      vehicleType: createDto.vehicleType,
      paymentMethod: createDto.paymentMethod || 'cash',
      distance: createDto.distance,
      duration: createDto.duration,
      status: BookingStatus.PENDING,
      estimatedPrice,
      trackingPath: [],
    });

    await booking.save();
    this.logger.log(`Booking created with ID: ${booking._id}`);

    // 3. Tìm tài xế gần nhất
    const nearbyDrivers = await this.findNearbyDrivers(
      createDto.pickupLocation.lat,
      createDto.pickupLocation.lng,
    );

    // 4. Gửi sự kiện booking.created
    await this.rabbitMQService.publish(
      'booking.events',
      'booking.created',
      {
        bookingId: booking._id.toString(),
        customerId,
        pickupLocation: createDto.pickupLocation,
        dropoffLocation: createDto.dropoffLocation,
        vehicleType: createDto.vehicleType,
        estimatedPrice,
        nearbyDrivers,
        timestamp: new Date().toISOString(),
      },
      {
        correlationId: `booking_${booking._id}`,
      }
    );

    // 5. Nếu không có tài xế nào
    if (nearbyDrivers.length === 0) {
      booking.status = BookingStatus.NO_DRIVER;
      await booking.save();
    }

    return this.mapToResponse(booking);
  }

  async findNearbyDrivers(lat: number, lng: number): Promise<any[]> {
    try {
      const driverServiceUrl = this.configService.get('DRIVER_SERVICE_URL', 'http://localhost:3003');
      const apiKey = this.configService.get('INTERNAL_API_KEY', 'internal-key');
      
      this.logger.log(`Calling driver service at: ${driverServiceUrl}/api/v1/internal/drivers/nearby?lat=${lat}&lng=${lng}&radius=5000`);

      // Dùng axios trực tiếp
      const axios = require('axios');
      const response = await axios.get(
        `${driverServiceUrl}/api/v1/internal/drivers/nearby`, 
        {
          params: {
            lat,
            lng,
            radius: 5000,
          },
          headers: {
            'x-service-id': 'booking-service',
            'x-internal-key': apiKey,
          },
          timeout: 5000,
        }
      );

      this.logger.log(`Found ${response.data.length} nearby drivers`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error finding nearby drivers: ${error.message}`);
      if (error.response) {
        this.logger.error(`Status: ${error.response.status}`);
        this.logger.error(`Data: ${JSON.stringify(error.response.data)}`);
      }
      return [];
    }
  }

  async acceptBooking(bookingId: string, acceptDto: AcceptBookingDto): Promise<BookingResponseDto> {
    this.logger.log(`Driver ${acceptDto.driverId} accepting booking: ${bookingId}`);

    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Booking is not available for acceptance');
    }

    // Cập nhật booking
    booking.driverId = acceptDto.driverId;
    booking.status = BookingStatus.CONFIRMED;
    booking.pickupTime = new Date(Date.now() + (acceptDto.eta || 5) * 60000); // ETA phút
    await booking.save();

    // Gửi sự kiện booking.accepted
    await this.rabbitMQService.publish(
      'booking.events',
      'booking.accepted',
      {
        bookingId: booking._id.toString(),
        customerId: booking.customerId,
        driverId: acceptDto.driverId,
        eta: acceptDto.eta || 5,
        timestamp: new Date().toISOString(),
      }
    );

    return this.mapToResponse(booking);
  }

  async updateStatus(bookingId: string, updateDto: UpdateStatusDto): Promise<BookingResponseDto> {
    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const oldStatus = booking.status;
    const newStatus = updateDto.status as BookingStatus;

    // Validate status transition
    this.validateStatusTransition(oldStatus, newStatus);

    // Update status
    booking.status = newStatus;

    // Update timestamps based on status
    switch (newStatus) {
      case BookingStatus.PICKING_UP:
        // Không cần update time đặc biệt
        break;
      case BookingStatus.IN_PROGRESS:
        booking.startTime = new Date();
        break;
      case BookingStatus.COMPLETED:
        booking.endTime = new Date();
        booking.isPaid = booking.paymentMethod === 'cash'; // Cash paid immediately
        break;
      case BookingStatus.CANCELLED:
        booking.cancellation = {
          cancelledBy: booking.driverId ? 'driver' : 'customer',
          reason: updateDto.reason || 'No reason provided',
          cancelledAt: new Date(),
        };
        break;
    }

    await booking.save();

    // Publish status change event
    await this.rabbitMQService.publish(
      'booking.events',
      `booking.${newStatus}`,
      {
        bookingId: booking._id.toString(),
        customerId: booking.customerId,
        driverId: booking.driverId,
        oldStatus,
        newStatus,
        timestamp: new Date().toISOString(),
      }
    );

    return this.mapToResponse(booking);
  }

  async updateLocation(bookingId: string, driverId: string, location: any): Promise<void> {
    const booking = await this.bookingModel.findOne({
      _id: bookingId,
      driverId,
      status: { $in: [BookingStatus.CONFIRMED, BookingStatus.PICKING_UP, BookingStatus.IN_PROGRESS] },
    });

    if (!booking) {
      throw new NotFoundException('Active booking not found for this driver');
    }

    // Add tracking point
    booking.trackingPath.push({
      ...location,
      timestamp: new Date(),
    });

    // Keep only last 100 points
    if (booking.trackingPath.length > 100) {
      booking.trackingPath = booking.trackingPath.slice(-100);
    }

    await booking.save();
  }

  async getBooking(bookingId: string, userId: string, role: string): Promise<BookingResponseDto> {
    const booking = await this.bookingModel.findById(bookingId);
    
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Check permission
    if (role === 'customer' && booking.customerId !== userId) {
      throw new BadRequestException('You do not have permission to view this booking');
    }
    if (role === 'driver' && booking.driverId !== userId) {
      throw new BadRequestException('You do not have permission to view this booking');
    }

    return this.mapToResponse(booking);
  }

  async getCustomerBookings(customerId: string, page: number = 1, limit: number = 10): Promise<any> {
    const skip = (page - 1) * limit;
    
    const [bookings, total] = await Promise.all([
      this.bookingModel
        .find({ customerId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.bookingModel.countDocuments({ customerId }),
    ]);

    return {
      data: bookings.map(b => this.mapToResponse(b)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getDriverBookings(driverId: string, page: number = 1, limit: number = 10): Promise<any> {
    const skip = (page - 1) * limit;
    
    const [bookings, total] = await Promise.all([
      this.bookingModel
        .find({ driverId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.bookingModel.countDocuments({ driverId }),
    ]);

    return {
      data: bookings.map(b => this.mapToResponse(b)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async calculatePrice(distance: number, duration: number, vehicleType: string): Promise<any> {
    // Price calculation logic (simplified)
    const basePrices = {
      [VehicleType.MOTORBIKE]: 10000,
      [VehicleType.CAR_4]: 20000,
      [VehicleType.CAR_7]: 25000,
    };

    const perKmPrices = {
      [VehicleType.MOTORBIKE]: 5000,
      [VehicleType.CAR_4]: 10000,
      [VehicleType.CAR_7]: 12000,
    };

    const basePrice = basePrices[vehicleType] || 20000;
    const perKmPrice = perKmPrices[vehicleType] || 10000;
    
    const distancePrice = distance * perKmPrice;
    const timePrice = (duration || 0) * 1000; // 1000đ/phút

    const total = basePrice + distancePrice + timePrice;

    return {
      basePrice,
      distancePrice,
      timePrice,
      surgeMultiplier: 1,
      total,
      currency: 'VND',
    };
  }

  private validateStatusTransition(oldStatus: BookingStatus, newStatus: BookingStatus): void {
  // Định nghĩa rõ ràng kiểu dữ liệu
  const validTransitions: Record<BookingStatus, BookingStatus[]> = {
    [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED, BookingStatus.NO_DRIVER],
    [BookingStatus.CONFIRMED]: [BookingStatus.PICKING_UP, BookingStatus.CANCELLED],
    [BookingStatus.PICKING_UP]: [BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED],
    [BookingStatus.IN_PROGRESS]: [BookingStatus.COMPLETED],
    [BookingStatus.COMPLETED]: [],
    [BookingStatus.CANCELLED]: [],
    [BookingStatus.NO_DRIVER]: [BookingStatus.PENDING],
  };

  if (!validTransitions[oldStatus]?.includes(newStatus)) {
    throw new BadRequestException(
      `Invalid status transition from ${oldStatus} to ${newStatus}`
    );
  }
}

  private mapToResponse(booking: BookingDocument): BookingResponseDto {
    const obj = booking.toObject();
    return {
      id: (obj._id as Types.ObjectId).toString(),
      customerId: obj.customerId,
      driverId: obj.driverId,
      pickupLocation: obj.pickupLocation,
      dropoffLocation: obj.dropoffLocation,
      waypoints: obj.waypoints,
      status: obj.status,
      vehicleType: obj.vehicleType,
      price: obj.price,
      distance: obj.distance,
      duration: obj.duration,
      paymentMethod: obj.paymentMethod,
      estimatedPrice: obj.estimatedPrice,
      pickupTime: obj.pickupTime,
      startTime: obj.startTime,
      endTime: obj.endTime,
      trackingPath: obj.trackingPath,
      cancellation: obj.cancellation,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    };
  }
}