import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService, RabbitMQService } from '@cab-booking/shared';
import { ConfigService } from '@nestjs/config';
import { BasePrice } from '../entities/base-price.entity';
import { Coupon } from '../entities/coupon.entity';
import { CouponUsage } from '../entities/coupon-usage.entity';
import { SurgePricingService } from '../surge/surge-pricing.service';
import { CalculatePriceDto, ApplyCouponDto, PriceResponseDto, CreateCouponDto } from '../dto/pricing.dto';
import { VehicleType, CouponStatus, CouponType, SurgeLevel } from '../enums/pricing.enum';

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);
  private readonly CURRENCY = 'VND';

  constructor(
    @InjectRepository(BasePrice)
    private basePriceRepository: Repository<BasePrice>,
    @InjectRepository(Coupon)
    private couponRepository: Repository<Coupon>,
    @InjectRepository(CouponUsage)
    private couponUsageRepository: Repository<CouponUsage>,
    private redisService: RedisService,
    private rabbitMQService: RabbitMQService,
    private configService: ConfigService,
    private surgePricingService: SurgePricingService,
  ) {
    this.initializeBasePrices();
    this.initializeSurgeConfigs();
    this.subscribeToEvents();
  }

  async initializeBasePrices() {
    const count = await this.basePriceRepository.count();
    if (count === 0) {
      const defaultPrices = [
        { vehicleType: VehicleType.MOTORBIKE, baseFare: 10000, perKm: 5000, perMinute: 1000, minimumFare: 15000 },
        { vehicleType: VehicleType.CAR_4, baseFare: 20000, perKm: 10000, perMinute: 1500, minimumFare: 30000 },
        { vehicleType: VehicleType.CAR_7, baseFare: 25000, perKm: 12000, perMinute: 2000, minimumFare: 40000 },
      ];
      await this.basePriceRepository.save(defaultPrices);
      this.logger.log('✅ Initialized base prices');
    }
  }

  async initializeSurgeConfigs() {
    try {
      const count = await this.surgePricingService['surgeConfigRepository'].count();
      if (count === 0) {
        const configs = [
          { level: SurgeLevel.NORMAL, multiplier: 1.0, minDriversOnline: 10, maxPendingBookings: 5 },
          { level: SurgeLevel.LOW, multiplier: 1.2, minDriversOnline: 5, maxPendingBookings: 8 },
          { level: SurgeLevel.MEDIUM, multiplier: 1.5, minDriversOnline: 3, maxPendingBookings: 12 },
          { level: SurgeLevel.HIGH, multiplier: 2.0, minDriversOnline: 1, maxPendingBookings: 20 },
          { level: SurgeLevel.PEAK, multiplier: 3.0, minDriversOnline: 0, maxPendingBookings: 100 },
        ];
        await this.surgePricingService['surgeConfigRepository'].save(configs);
        this.logger.log('✅ Initialized surge configs');
      }
    } catch (error) {
      this.logger.warn(`Surge config initialization skipped: ${error.message}`);
    }
  }

  async subscribeToEvents() {
    try {
      await this.rabbitMQService.subscribe(
        'pricing-service.queue',
        async (msg: any) => {
          await this.handleBookingEvent(msg);
        },
        {
          exchange: 'booking.events',
          routingKey: 'booking.created',
        },
      );
      this.logger.log('✅ Subscribed to events');
    } catch (error) {
      this.logger.warn(`Failed to subscribe: ${error.message}`);
    }
  }

  async handleBookingEvent(event: any) {
    this.logger.log(`Received booking event: ${JSON.stringify(event)}`);
    // Cập nhật metrics cho surge pricing
  }

  async calculatePrice(calculateDto: CalculatePriceDto): Promise<PriceResponseDto> {
    this.logger.log(`Calculating price for vehicle ${calculateDto.vehicleType}`);

    // 1. Lấy giá cơ bản
    const basePrice = await this.basePriceRepository.findOne({
      where: { vehicleType: calculateDto.vehicleType, isActive: true },
    });

    if (!basePrice) {
      throw new NotFoundException('Base price not found for this vehicle type');
    }

    // 2. Tính giá cơ bản
    const distancePrice = calculateDto.distance * basePrice.perKm;
    const timePrice = calculateDto.duration * basePrice.perMinute;
    const subtotal = basePrice.baseFare + distancePrice + timePrice;
    const baseTotal = Math.max(subtotal, basePrice.minimumFare);

    // 3. Tính surge multiplier
    const surge = await this.surgePricingService.getSurgeMultiplier(
      calculateDto.latitude,
      calculateDto.longitude,
    );

    const surgeAmount = baseTotal * (surge.multiplier - 1);
    const subtotalWithSurge = baseTotal + surgeAmount;

    // 4. Áp dụng coupon (nếu có)
    let couponDiscount = 0;
    let couponCode: string | undefined = undefined;

    if (calculateDto.couponCode && calculateDto.userId) {
      try {
        const applyDto: ApplyCouponDto = {
          couponCode: calculateDto.couponCode,
          amount: subtotalWithSurge,
          vehicleType: calculateDto.vehicleType,
          userId: calculateDto.userId,
        };
        const couponResult = await this.applyCoupon(applyDto);
        couponDiscount = couponResult.discount;
        couponCode = calculateDto.couponCode;
      } catch (error) {
        this.logger.warn(`Coupon invalid: ${error.message}`);
      }
    }

    const finalPrice = Math.max(subtotalWithSurge - couponDiscount, 0);

    const response: PriceResponseDto = {
      basePrice: basePrice.baseFare,
      distancePrice,
      timePrice,
      subtotal: baseTotal,
      surgeMultiplier: surge.multiplier,
      surgeLevel: surge.level,
      surgeAmount,
      couponDiscount,
      couponCode,
      finalPrice,
      currency: this.CURRENCY,
      breakdown: {
        baseFare: basePrice.baseFare,
        perKm: basePrice.perKm,
        perMinute: basePrice.perMinute,
        distance: calculateDto.distance,
        duration: calculateDto.duration,
        surgeReason: surge.reason,
      },
    };

    return response;
  }

  async applyCoupon(applyDto: ApplyCouponDto): Promise<{ discount: number; finalAmount: number }> {
    this.logger.log(`Applying coupon ${applyDto.couponCode}`);

    const coupon = await this.couponRepository.findOne({
      where: { code: applyDto.couponCode.toUpperCase(), status: CouponStatus.ACTIVE },
    });

    if (!coupon) {
      throw new BadRequestException('Invalid coupon code');
    }

    // Kiểm tra thời gian
    const now = new Date();
    if (coupon.validFrom && now < coupon.validFrom) {
      throw new BadRequestException('Coupon not yet valid');
    }
    if (coupon.validTo && now > coupon.validTo) {
      throw new BadRequestException('Coupon expired');
    }

    // Kiểm tra giá trị đơn hàng tối thiểu
    if (applyDto.amount < coupon.minOrderValue) {
      throw new BadRequestException(`Minimum order value is ${coupon.minOrderValue.toLocaleString()} VND`);
    }

    // Kiểm tra loại xe áp dụng
    if (coupon.applicableVehicles?.length > 0 && applyDto.vehicleType) {
      if (!coupon.applicableVehicles.includes(applyDto.vehicleType as any)) {
        throw new BadRequestException('Coupon not applicable for this vehicle type');
      }
    }

    // Kiểm tra user có được áp dụng không
    if (coupon.applicableUserIds?.length > 0 && applyDto.userId) {
      if (!coupon.applicableUserIds.includes(applyDto.userId)) {
        throw new BadRequestException('Coupon not applicable for this user');
      }
    }

    // Kiểm tra giới hạn số lượt dùng
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    // Kiểm tra giới hạn mỗi user
    if (applyDto.userId && coupon.perUserLimit > 0) {
      const userUsageCount = await this.couponUsageRepository.count({
        where: { couponId: coupon.id, userId: applyDto.userId },
      });
      if (userUsageCount >= coupon.perUserLimit) {
        throw new BadRequestException('You have already used this coupon');
      }
    }

    // Tính toán giảm giá
    let discount = 0;
    if (coupon.type === CouponType.PERCENTAGE) {
      discount = (applyDto.amount * coupon.value) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.value;
    }

    const finalAmount = Math.max(applyDto.amount - discount, 0);

    return { discount, finalAmount };
  }

  async createCoupon(createDto: CreateCouponDto): Promise<Coupon> {
    this.logger.log(`Creating coupon: ${createDto.code}`);

    const existing = await this.couponRepository.findOne({
      where: { code: createDto.code.toUpperCase() },
    });

    if (existing) {
      throw new BadRequestException('Coupon code already exists');
    }

    const coupon = this.couponRepository.create({
      code: createDto.code.toUpperCase(),
      name: createDto.name,
      description: createDto.description,
      type: createDto.type as any,
      value: createDto.value,
      maxDiscount: createDto.maxDiscount,
      minOrderValue: createDto.minOrderValue || 0,
      applicableVehicles: createDto.applicableVehicles as any,
      applicableZones: createDto.applicableZones,
      usageLimit: createDto.usageLimit || 0,
      perUserLimit: createDto.perUserLimit || 1,
      validFrom: createDto.validFrom,
      validTo: createDto.validTo,
      status: CouponStatus.ACTIVE,
    });

    await this.couponRepository.save(coupon);
    this.logger.log(`✅ Coupon created: ${coupon.code}`);

    return coupon;
  }

  async useCoupon(couponId: string, userId: string, bookingId: string, amount: number, discount: number): Promise<void> {
    const usage = this.couponUsageRepository.create({
      couponId,
      userId,
      bookingId,
      originalAmount: amount,
      discountAmount: discount,
      finalAmount: amount - discount,
    });
    await this.couponUsageRepository.save(usage);

    await this.couponRepository.increment({ id: couponId }, 'usedCount', 1);
  }

  async getBasePrices(): Promise<BasePrice[]> {
    return this.basePriceRepository.find({ where: { isActive: true } });
  }

  async updateBasePrice(id: string, data: Partial<BasePrice>): Promise<BasePrice> {
    await this.basePriceRepository.update(id, data);
    const updated = await this.basePriceRepository.findOne({ where: { id } });
    if (!updated) {
      throw new NotFoundException('Base price not found');
    }
    return updated;
  }

  async getAllCoupons(): Promise<Coupon[]> {
    return this.couponRepository.find({ order: { createdAt: 'DESC' } });
  }

  async disableCoupon(id: string): Promise<void> {
    await this.couponRepository.update(id, { status: CouponStatus.DISABLED });
  }

  async getCouponUsageStats(couponId: string): Promise<any> {
    const usages = await this.couponUsageRepository.find({
      where: { couponId },
      order: { usedAt: 'DESC' },
      take: 100,
    });
    const totalDiscount = usages.reduce((sum, u) => sum + u.discountAmount, 0);
    return {
      totalUses: usages.length,
      totalDiscount,
      recentUsages: usages.slice(0, 10),
    };
  }
}