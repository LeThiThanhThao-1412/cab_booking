import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RedisService, RabbitMQService } from '@cab-booking/shared';
import { ConfigService } from '@nestjs/config';
import { CreateBookingDto, AcceptBookingDto, UpdateStatusDto, BookingResponseDto } from '../dto/booking.dto';
import { Booking, BookingDocument, BookingStatus, VehicleType } from '../schemas/booking.schema';
import axios from 'axios';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);
  private readonly NEARBY_RADIUS = 5000;

  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    private redisService: RedisService,
    private rabbitMQService: RabbitMQService,
    private configService: ConfigService,
  ) {}

  // Gọi Pricing Service để lấy giá
  async getPriceFromPricing(createDto: CreateBookingDto, authHeader?: string): Promise<any> {
    try {
      const pricingUrl = this.configService.get('PRICING_SERVICE_URL', 'http://localhost:3008');
      
      this.logger.log(`Calling pricing service at: ${pricingUrl}/api/v1/pricing/calculate`);
      
      // ✅ KHÔNG gửi distance/duration nếu không có - để Pricing tự tính
      const requestBody: any = {
        vehicleType: createDto.vehicleType,
        pickupLocation: createDto.pickupLocation,
        dropoffLocation: createDto.dropoffLocation,
      };
      
      // Chỉ thêm distance/duration nếu có giá trị
      if (createDto.distance && createDto.distance > 0) {
        requestBody.distance = createDto.distance;
      }
      if (createDto.duration && createDto.duration > 0) {
        requestBody.duration = createDto.duration;
      }
      
      const response = await axios.post(
        `${pricingUrl}/api/v1/pricing/calculate`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(authHeader && { 'Authorization': authHeader }),
          },
          timeout: 10000,
        }
      );
      
      this.logger.log(`✅ Price from pricing service: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`❌ Error calling pricing service: ${error.message}`);
      if (error.response) {
        this.logger.error(`Status: ${error.response.status}`);
        this.logger.error(`Data: ${JSON.stringify(error.response.data)}`);
      }
      // Fallback: tự tính giá nếu pricing service lỗi
      return this.calculatePriceFallback(createDto);
    }
  }

  // Tính giá fallback (khi pricing service lỗi)
  private async calculatePriceFallback(createDto: CreateBookingDto): Promise<any> {
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

    const basePrice = basePrices[createDto.vehicleType] || 20000;
    const perKmPrice = perKmPrices[createDto.vehicleType] || 10000;
    
    // Lấy distance và duration, mặc định là 0 nếu không có
    const distance = createDto.distance || 5;  // Mặc định 5km
    const duration = createDto.duration || 15; // Mặc định 15 phút
    
    const distancePrice = distance * perKmPrice;
    const timePrice = duration * 1000;
    const total = basePrice + distancePrice + timePrice;

    return {
      basePrice,
      distancePrice,
      timePrice,
      surgeMultiplier: 1,
      total,
      currency: 'VND',
      distance: distance,
      estimatedDuration: duration,
    };
  }

  async createBooking(customerId: string, createDto: CreateBookingDto, authHeader?: string): Promise<BookingResponseDto> {
    this.logger.log(`Creating booking for customer: ${customerId}`);

    // 1. Gọi Pricing Service để lấy giá (truyền token)
    const estimatedPrice = await this.getPriceFromPricing(createDto, authHeader);

    // Lấy distance và duration từ response của Pricing (hoặc từ DTO)
    const distance = estimatedPrice?.distance || createDto.distance || 5;
    const duration = estimatedPrice?.estimatedDuration || createDto.duration || 15;

    // 2. Tạo booking trong MongoDB
    const booking = new this.bookingModel({
      customerId,
      pickupLocation: createDto.pickupLocation,
      dropoffLocation: createDto.dropoffLocation,
      waypoints: createDto.waypoints || [],
      vehicleType: createDto.vehicleType,
      paymentMethod: createDto.paymentMethod || 'cash',
      distance: distance,
      duration: duration,
      status: BookingStatus.PENDING,
      estimatedPrice,
      trackingPath: [],
    });

    await booking.save();
    this.logger.log(`Booking created with ID: ${booking._id}`);

    // 3. Gửi sự kiện booking.created
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
        distance: distance,
        duration: duration,
        timestamp: new Date().toISOString(),
      },
      {
        correlationId: `booking_${booking._id}`,
      }
    );

    return this.mapToResponse(booking);
  }

  async findNearbyDrivers(lat: number, lng: number): Promise<any[]> {
    try {
      const driverServiceUrl = this.configService.get('DRIVER_SERVICE_URL', 'http://localhost:3003');
      const apiKey = this.configService.get('INTERNAL_API_KEY', 'internal-key');
      
      this.logger.log(`Calling driver service at: ${driverServiceUrl}/api/v1/internal/drivers/nearby?lat=${lat}&lng=${lng}&radius=5000`);

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
    } catch (error: any) {
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

    booking.driverId = acceptDto.driverId;
    booking.status = BookingStatus.CONFIRMED;
    booking.pickupTime = new Date(Date.now() + (acceptDto.eta || 5) * 60000);
    await booking.save();

    await this.rabbitMQService.publish(
      'booking.events',
      'booking.accepted',
      {
        id: booking._id.toString(),
        bookingId: booking._id.toString(),
        customerId: booking.customerId,
        driverId: acceptDto.driverId,
        pickupLocation: booking.pickupLocation,
        dropoffLocation: booking.dropoffLocation,
        estimatedPrice: booking.estimatedPrice,
        distance: booking.distance,
        duration: booking.duration,
        waypoints: booking.waypoints || [],
        eta: acceptDto.eta || 5,
        timestamp: new Date().toISOString(),
      }
    );

    this.logger.log(`✅ Event booking.accepted published for booking: ${bookingId}`);
    return this.mapToResponse(booking);
  }

  async updateStatus(bookingId: string, updateDto: UpdateStatusDto): Promise<BookingResponseDto> {
    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const oldStatus = booking.status;
    const newStatus = updateDto.status as BookingStatus;

    this.validateStatusTransition(oldStatus, newStatus);

    booking.status = newStatus;

    switch (newStatus) {
      case BookingStatus.PICKING_UP:
        break;
      case BookingStatus.IN_PROGRESS:
        booking.startTime = new Date();
        break;
      case BookingStatus.COMPLETED:
        booking.endTime = new Date();
        booking.isPaid = booking.paymentMethod === 'cash';
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

    booking.trackingPath.push({
      ...location,
      timestamp: new Date(),
    });

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
  // Thêm method này vào class BookingService
async getBookingById(bookingId: string, userId: string, role: string): Promise<BookingResponseDto> {
  const booking = await this.bookingModel.findById(bookingId);
  
  if (!booking) {
    throw new NotFoundException('Booking not found');
  }

  if (role === 'customer' && booking.customerId !== userId) {
    throw new BadRequestException('You do not have permission to view this booking');
  }
  if (role === 'driver' && booking.driverId !== userId) {
    throw new BadRequestException('You do not have permission to view this booking');
  }

  return this.mapToResponse(booking);
}
  private validateStatusTransition(oldStatus: BookingStatus, newStatus: BookingStatus): void {
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

  async assignDriver(bookingId: string, driverId: string, eta?: number): Promise<BookingResponseDto> {
    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    booking.driverId = driverId;
    booking.status = BookingStatus.CONFIRMED;
    booking.pickupTime = new Date(Date.now() + (eta || 5) * 60000);
    
    await booking.save();

    await this.rabbitMQService.publish(
      'booking.events',
      'booking.accepted',
      {
        bookingId: booking._id.toString(),
        customerId: booking.customerId,
        driverId,
        pickupLocation: booking.pickupLocation,
        dropoffLocation: booking.dropoffLocation,
        price: booking.price,
        distance: booking.distance,
        eta: eta || 5,
        timestamp: new Date().toISOString(),
      }
    );

    return this.mapToResponse(booking);
  }
}