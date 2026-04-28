import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RedisService, RabbitMQService } from '@cab-booking/shared';
import { ConfigService } from '@nestjs/config';
import { CreateBookingDto, AcceptBookingDto, UpdateStatusDto, BookingResponseDto } from '../dto/booking.dto';
import { Booking, BookingDocument, BookingStatus, VehicleType, PaymentMethod } from '../schemas/booking.schema';
import axios from 'axios';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);
  private readonly NEARBY_RADIUS = 5000;

  private readonly NON_CASH_METHODS: string[] = [
    PaymentMethod.CARD,
    PaymentMethod.WALLET,
    PaymentMethod.MOMO,
    PaymentMethod.ZALOPAY,
    PaymentMethod.VNPAY,
  ];

  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    private redisService: RedisService,
    private rabbitMQService: RabbitMQService,
    private configService: ConfigService,
  ) {}

  private shouldCreatePayment(paymentMethod: string): boolean {
    return this.NON_CASH_METHODS.includes(paymentMethod);
  }

  // ============ CREATE BOOKING ============
  async createBooking(
    customerId: string,
    createDto: CreateBookingDto,
    authHeader?: string,
  ): Promise<BookingResponseDto> {
    this.logger.log(`📝 [Bước 1/5] Bắt đầu tạo booking cho customer: ${customerId}`);
    this.logger.log(`💳 Phương thức thanh toán: ${createDto.paymentMethod || 'cash'}`);

    // BƯỚC 1: GỌI PRICING SERVICE
    this.logger.log(`💰 [Bước 1/5] Gọi Pricing Service để tính giá...`);
    const estimatedPrice = await this.getPriceFromPricing(createDto, authHeader);
    const distance = estimatedPrice?.distance || createDto.distance || 5;
    const duration = estimatedPrice?.estimatedDuration || createDto.duration || 15;
    const totalAmount = estimatedPrice?.finalPrice || estimatedPrice?.total || 0;

    this.logger.log(`✅ Giá: ${totalAmount.toLocaleString()}đ, ${distance}km, ${duration}phút`);

    // BƯỚC 2: TẠO BOOKING
    this.logger.log(`💾 [Bước 2/5] Tạo booking trong MongoDB...`);
    const paymentMethod = createDto.paymentMethod || PaymentMethod.CASH;

    const booking = new this.bookingModel({
      customerId,
      pickupLocation: createDto.pickupLocation,
      dropoffLocation: createDto.dropoffLocation,
      waypoints: createDto.waypoints || [],
      vehicleType: createDto.vehicleType,
      paymentMethod: paymentMethod,
      distance: distance,
      duration: duration,
      status: BookingStatus.PENDING,
      estimatedPrice,
      trackingPath: [],
    });

    await booking.save();
    this.logger.log(`✅ Booking đã tạo: ${booking._id}`);

    // BƯỚC 3: GỌI PAYMENT SERVICE (CHỈ KHI KHÔNG PHẢI CASH)
    let paymentInfo: { id: string; status: string; amount: number } | null = null;

    if (this.shouldCreatePayment(paymentMethod)) {
      this.logger.log(`💳 [Bước 3/5] Tạo PENDING payment record...`);
      
      try {
        const paymentServiceUrl = this.configService.get('PAYMENT_SERVICE_URL', 'http://localhost:3007');
        const internalKey = this.configService.get('INTERNAL_API_KEY', 'internal-key');

        const paymentPayload = {
          rideId: booking._id.toString(),
          bookingId: booking._id.toString(),
          customerId: customerId,
          driverId: '',
          amount: totalAmount,
          discountAmount: 0,
          finalAmount: totalAmount,
          method: paymentMethod,
          metadata: {
            basePrice: estimatedPrice?.basePrice,
            distancePrice: estimatedPrice?.distancePrice,
            timePrice: estimatedPrice?.timePrice,
            surgeMultiplier: estimatedPrice?.surgeMultiplier,
            surgeLevel: estimatedPrice?.surgeLevel,
          },
        };

        const paymentResponse = await axios.post(
          `${paymentServiceUrl}/api/v1/internal/create`,
          paymentPayload,
          {
            headers: {
              'Content-Type': 'application/json',
              'x-service-id': 'booking-service',
              'x-internal-key': internalKey,
            },
            timeout: 10000,
          },
        );

        this.logger.log(`✅ Payment record: ${paymentResponse.data.id} (${paymentResponse.data.status})`);

        booking.paymentId = paymentResponse.data.id;
        await booking.save();

        paymentInfo = {
          id: paymentResponse.data.id,
          status: paymentResponse.data.status || 'pending',
          amount: totalAmount,
        };

      } catch (error: any) {
        this.logger.error(`❌ Lỗi Payment: ${error.message}`);
        paymentInfo = { id: 'payment_pending', status: 'failed_to_create', amount: totalAmount };
      }
    } else {
      this.logger.log(`💵 [Bước 3/5] Cash - Không cần payment record`);
    }

    // BƯỚC 4: GỌI NOTIFICATION
    this.logger.log(`🔔 [Bước 4/5] Gửi thông báo...`);
    try {
      const notificationServiceUrl = this.configService.get('NOTIFICATION_SERVICE_URL', 'http://localhost:3009');
      const internalKey = this.configService.get('INTERNAL_API_KEY', 'internal-key');

      await axios.post(
        `${notificationServiceUrl}/api/v1/internal/send`,
        {
          userId: customerId,
          type: 'booking.pending',
          title: '🔍 Đang tìm tài xế cho bạn...',
          body: `Đơn hàng #${booking._id.toString().slice(-6)} đang được tìm tài xế gần nhất.`,
          data: {
            bookingId: booking._id.toString(),
            estimatedPrice: estimatedPrice,
            pickupLocation: { address: createDto.pickupLocation.address, lat: createDto.pickupLocation.lat, lng: createDto.pickupLocation.lng },
            dropoffLocation: { address: createDto.dropoffLocation.address, lat: createDto.dropoffLocation.lat, lng: createDto.dropoffLocation.lng },
            vehicleType: createDto.vehicleType,
            paymentMethod: paymentMethod,
            distance: distance,
            duration: duration,
            createdAt: new Date().toISOString(),
          },
          channel: 'all',
          priority: 'normal',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-service-id': 'booking-service',
            'x-internal-key': internalKey,
          },
          timeout: 5000,
        },
      );
      this.logger.log(`✅ Thông báo đã gửi`);
    } catch (error: any) {
      this.logger.error(`❌ Lỗi Notification: ${error.message}`);
    }

    // BƯỚC 5: PUBLISH EVENT
    this.logger.log(`📤 [Bước 5/5] Publish booking.created...`);
    try {
      await this.rabbitMQService.publish(
        'booking.events',
        'booking.created',
        {
          bookingId: booking._id.toString(),
          customerId,
          pickupLocation: createDto.pickupLocation,
          dropoffLocation: createDto.dropoffLocation,
          vehicleType: createDto.vehicleType,
          paymentMethod: paymentMethod,
          estimatedPrice,
          distance: distance,
          duration: duration,
          paymentId: booking.paymentId || null,
          paymentInfo: paymentInfo,
          timestamp: new Date().toISOString(),
        },
        { correlationId: `booking_${booking._id}` },
      );
      this.logger.log(`✅ Event đã publish`);
    } catch (error: any) {
      this.logger.error(`❌ Lỗi publish: ${error.message}`);
    }

    this.logger.log(`🎉 [HOÀN TẤT] Booking ${booking._id} thành công!`);
    return this.mapToResponse(booking, paymentInfo);
  }

  // ============ GỌI PRICING SERVICE ============
  async getPriceFromPricing(createDto: CreateBookingDto, authHeader?: string): Promise<any> {
    try {
      const pricingUrl = this.configService.get('PRICING_SERVICE_URL', 'http://localhost:3008');
      const requestBody: any = {
        vehicleType: createDto.vehicleType,
        pickupLocation: createDto.pickupLocation,
        dropoffLocation: createDto.dropoffLocation,
      };
      if (createDto.distance && createDto.distance > 0) requestBody.distance = createDto.distance;
      if (createDto.duration && createDto.duration > 0) requestBody.duration = createDto.duration;

      const response = await axios.post(`${pricingUrl}/api/v1/pricing/calculate`, requestBody, {
        headers: { 'Content-Type': 'application/json', ...(authHeader && { Authorization: authHeader }) },
        timeout: 10000,
      });
      return response.data;
    } catch (error: any) {
      this.logger.error(`❌ Pricing error: ${error.message}`);
      return this.calculatePriceFallback(createDto);
    }
  }

  private async calculatePriceFallback(createDto: CreateBookingDto): Promise<any> {
    const basePrices = { [VehicleType.MOTORBIKE]: 10000, [VehicleType.CAR_4]: 20000, [VehicleType.CAR_7]: 25000 };
    const perKmPrices = { [VehicleType.MOTORBIKE]: 5000, [VehicleType.CAR_4]: 10000, [VehicleType.CAR_7]: 12000 };
    const basePrice = basePrices[createDto.vehicleType] || 20000;
    const perKmPrice = perKmPrices[createDto.vehicleType] || 10000;
    const distance = createDto.distance || 5;
    const duration = createDto.duration || 15;
    return {
      basePrice, distancePrice: distance * perKmPrice, timePrice: duration * 1000,
      surgeMultiplier: 1, total: basePrice + (distance * perKmPrice) + (duration * 1000),
      currency: 'VND', distance, estimatedDuration: duration,
    };
  }

  async findNearbyDrivers(lat: number, lng: number): Promise<any[]> {
    try {
      const driverServiceUrl = this.configService.get('DRIVER_SERVICE_URL', 'http://localhost:3003');
      const apiKey = this.configService.get('INTERNAL_API_KEY', 'internal-key');
      const response = await axios.get(`${driverServiceUrl}/api/v1/internal/drivers/nearby`, {
        params: { lat, lng, radius: this.NEARBY_RADIUS },
        headers: { 'x-service-id': 'booking-service', 'x-internal-key': apiKey },
        timeout: 5000,
      });
      return response.data;
    } catch (error: any) {
      return [];
    }
  }

  async acceptBooking(bookingId: string, acceptDto: AcceptBookingDto): Promise<BookingResponseDto> {
    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) throw new NotFoundException('Không tìm thấy booking');
    if (booking.status !== BookingStatus.PENDING) throw new BadRequestException('Booking không khả dụng');

    booking.driverId = acceptDto.driverId;
    booking.status = BookingStatus.CONFIRMED;
    booking.pickupTime = new Date(Date.now() + (acceptDto.eta || 5) * 60000);
    await booking.save();

    await this.rabbitMQService.publish('booking.events', 'booking.accepted', {
      id: booking._id.toString(), bookingId: booking._id.toString(),
      customerId: booking.customerId, driverId: acceptDto.driverId,
      pickupLocation: booking.pickupLocation, dropoffLocation: booking.dropoffLocation,
      estimatedPrice: booking.estimatedPrice, distance: booking.distance, duration: booking.duration,
      waypoints: booking.waypoints || [], eta: acceptDto.eta || 5, timestamp: new Date().toISOString(),
    });

    return this.mapToResponse(booking, null);
  }

  async updateStatus(bookingId: string, updateDto: UpdateStatusDto): Promise<BookingResponseDto> {
    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) throw new NotFoundException('Không tìm thấy booking');

    const oldStatus = booking.status;
    const newStatus = updateDto.status as BookingStatus;
    this.validateStatusTransition(oldStatus, newStatus);

    booking.status = newStatus;
    switch (newStatus) {
      case BookingStatus.IN_PROGRESS: booking.startTime = new Date(); break;
      case BookingStatus.COMPLETED: booking.endTime = new Date(); booking.isPaid = booking.paymentMethod === 'cash'; break;
      case BookingStatus.CANCELLED: booking.cancellation = { cancelledBy: booking.driverId ? 'driver' : 'customer', reason: updateDto.reason || 'Không có lý do', cancelledAt: new Date() }; break;
    }
    await booking.save();

    await this.rabbitMQService.publish('booking.events', `booking.${newStatus}`, {
      bookingId: booking._id.toString(), customerId: booking.customerId, driverId: booking.driverId,
      oldStatus, newStatus, reason: updateDto.reason, timestamp: new Date().toISOString(),
    });

    return this.mapToResponse(booking, null);
  }

  async updateLocation(bookingId: string, driverId: string, location: any): Promise<void> {
    const booking = await this.bookingModel.findOne({
      _id: bookingId, driverId,
      status: { $in: [BookingStatus.CONFIRMED, BookingStatus.PICKING_UP, BookingStatus.IN_PROGRESS] },
    });
    if (!booking) throw new NotFoundException('Không tìm thấy booking active');
    booking.trackingPath.push({ ...location, timestamp: new Date() });
    if (booking.trackingPath.length > 100) booking.trackingPath = booking.trackingPath.slice(-100);
    await booking.save();
  }

  // ============ ASSIGN DRIVER - KHÔNG PUBLISH BOOKING.ACCEPTED ============
  async assignDriver(bookingId: string, driverId: string, eta?: number): Promise<BookingResponseDto> {
    this.logger.log(`🔗 Gán tài xế ${driverId} cho booking ${bookingId}`);

    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) throw new NotFoundException('Không tìm thấy booking');

    booking.driverId = driverId;
    booking.status = BookingStatus.CONFIRMED;
    booking.pickupTime = new Date(Date.now() + (eta || 5) * 60000);
    await booking.save();

    // ============ KHÔNG PUBLISH BOOKING.ACCEPTED Ở ĐÂY ============
    // Matching Service đã publish booking.accepted rồi
    // Nếu publish thêm sẽ khiến Ride Service tạo 2 ride

    this.logger.log(`✅ Tài xế ${driverId} đã được gán cho booking ${bookingId}`);
    return this.mapToResponse(booking, null);
  }

  async getBooking(bookingId: string, userId: string, role: string): Promise<BookingResponseDto> {
    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) throw new NotFoundException('Không tìm thấy booking');
    if (role !== 'internal') {
      if (role === 'customer' && booking.customerId !== userId) throw new BadRequestException('Không có quyền');
      if (role === 'driver' && booking.driverId !== userId) throw new BadRequestException('Không có quyền');
    }
    return this.mapToResponse(booking, null);
  }

  async getBookingById(bookingId: string, userId: string, role: string): Promise<BookingResponseDto> {
    return this.getBooking(bookingId, userId, role);
  }

  async getCustomerBookings(customerId: string, page: number = 1, limit: number = 10): Promise<any> {
    const skip = (page - 1) * limit;
    const [bookings, total] = await Promise.all([
      this.bookingModel.find({ customerId }).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.bookingModel.countDocuments({ customerId }),
    ]);
    return { data: bookings.map((b) => this.mapToResponse(b, null)), total, page, totalPages: Math.ceil(total / limit) };
  }

  async getDriverBookings(driverId: string, page: number = 1, limit: number = 10): Promise<any> {
    const skip = (page - 1) * limit;
    const [bookings, total] = await Promise.all([
      this.bookingModel.find({ driverId }).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.bookingModel.countDocuments({ driverId }),
    ]);
    return { data: bookings.map((b) => this.mapToResponse(b, null)), total, page, totalPages: Math.ceil(total / limit) };
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
      throw new BadRequestException(`Không thể chuyển từ ${oldStatus} sang ${newStatus}`);
    }
  }

  private mapToResponse(
    booking: BookingDocument,
    paymentInfo?: { id: string; status: string; amount: number } | null,
  ): BookingResponseDto {
    const obj = booking.toObject();
    const totalAmount = obj.estimatedPrice?.finalPrice || obj.estimatedPrice?.total || 0;
    
    const response: any = {
      id: (obj._id as Types.ObjectId).toString(),
      customerId: obj.customerId,
      driverId: obj.driverId || null,
      pickupLocation: obj.pickupLocation,
      dropoffLocation: obj.dropoffLocation,
      waypoints: obj.waypoints || [],
      status: obj.status,
      vehicleType: obj.vehicleType,
      price: obj.price || null,
      distance: obj.distance,
      duration: obj.duration,
      paymentMethod: obj.paymentMethod,
      estimatedPrice: obj.estimatedPrice,
      pickupTime: obj.pickupTime || null,
      startTime: obj.startTime || null,
      endTime: obj.endTime || null,
      trackingPath: obj.trackingPath || [],
      cancellation: obj.cancellation || null,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    };

    if (paymentInfo) {
      response.payment = paymentInfo;
    } else if (obj.paymentId) {
      response.payment = { id: obj.paymentId, status: 'pending', amount: totalAmount };
    } else if (obj.paymentMethod && obj.paymentMethod !== 'cash') {
      response.payment = { id: null, status: 'failed_to_create', amount: totalAmount };
    } else {
      response.payment = null;
    }

    return response;
  }
}