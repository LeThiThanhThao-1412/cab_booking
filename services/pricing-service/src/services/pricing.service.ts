import { Injectable, Logger, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService, RabbitMQService } from '@cab-booking/shared';
import { ConfigService } from '@nestjs/config';
import { BasePrice } from '../entities/base-price.entity';
import { Coupon } from '../entities/coupon.entity';
import { CouponUsage } from '../entities/coupon-usage.entity';
import { SurgePricingService } from '../surge/surge-pricing.service';
import { DistanceService } from './distance.service';
import { CalculatePriceDto, ApplyCouponDto, PriceResponseDto, CreateCouponDto } from '../dto/pricing.dto';
import { VehicleType, CouponStatus, CouponType, SurgeLevel } from '../enums/pricing.enum';

@Injectable()
export class PricingService implements OnModuleInit {
  private readonly logger = new Logger(PricingService.name);
  private readonly CURRENCY = 'VND';
  private readonly AVERAGE_SPEED = 30;
  private isSubscribed = false;

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
    private distanceService: DistanceService,
  ) {}

  async onModuleInit() {
    await new Promise(resolve => setTimeout(resolve, 3000));
    await this.initializeBasePrices();
    await this.initializeSurgeConfigs();
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
        this.logger.warn(`Failed to subscribe (attempt ${retryCount + 1}/${maxRetries}): ${error.message}`);
        setTimeout(() => this.subscribeWithRetry(retryCount + 1), retryDelay);
      } else {
        this.logger.error(`Failed to subscribe after ${maxRetries} attempts`);
      }
    }
  }

  async subscribeToEvents() {
    try {
      const channel = this.rabbitMQService['channel'];
      if (!channel) {
        throw new Error('RabbitMQ channel is not available');
      }

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
      this.logger.log('✅ Subscribed to booking events');
    } catch (error) {
      this.logger.error(`Failed to subscribe: ${error.message}`);
      throw error;
    }
  }

  async handleBookingEvent(event: any) {
    this.logger.log(`Received booking event: ${JSON.stringify(event)}`);
  }

  async initializeBasePrices() {
    const count = await this.basePriceRepository.count();
    if (count === 0) {
      const defaultPrices = [
        { vehicleType: VehicleType.MOTORBIKE, baseFare: 10000, perKm: 5000, perMinute: 1000, minimumFare: 15000, isActive: true },
        { vehicleType: VehicleType.CAR_4, baseFare: 20000, perKm: 10000, perMinute: 1500, minimumFare: 30000, isActive: true },
        { vehicleType: VehicleType.CAR_7, baseFare: 25000, perKm: 12000, perMinute: 2000, minimumFare: 40000, isActive: true },
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

  async calculatePrice(calculateDto: CalculatePriceDto): Promise<PriceResponseDto> {
    this.logger.log(`Calculating price for ${calculateDto.vehicleType}`);

    let distance = calculateDto.distance;
    let estimatedDuration = calculateDto.duration;

    if ((!distance || !estimatedDuration) && calculateDto.pickupLocation && calculateDto.dropoffLocation) {
      const route = await this.distanceService.calculateDistance(
        calculateDto.pickupLocation,
        calculateDto.dropoffLocation,
      );
      distance = route.distance;
      estimatedDuration = route.duration;
      this.logger.log(`Calculated route: ${distance.toFixed(2)}km, ${estimatedDuration.toFixed(0)} min`);
    }

    if (!distance || distance <= 0) {
      throw new BadRequestException('Invalid distance. Please provide pickup and dropoff locations.');
    }

    if (!estimatedDuration || estimatedDuration <= 0) {
      estimatedDuration = (distance / this.AVERAGE_SPEED) * 60;
    }

    const basePrice = await this.basePriceRepository.findOne({
      where: { vehicleType: calculateDto.vehicleType, isActive: true },
    });

    if (!basePrice) {
      throw new NotFoundException('Base price not found for this vehicle type');
    }

    // Convert to number to ensure proper calculation
    const baseFare = Number(basePrice.baseFare);
    const perKm = Number(basePrice.perKm);
    const perMinute = Number(basePrice.perMinute);
    const minimumFare = Number(basePrice.minimumFare);

    const distancePrice = distance * perKm;
    const timePrice = estimatedDuration * perMinute;
    const subtotal = baseFare + distancePrice + timePrice;
    const baseTotal = Math.max(subtotal, minimumFare);

    const surge = await this.surgePricingService.getSurgeMultiplier(
      calculateDto.pickupLocation?.lat || 0,
      calculateDto.pickupLocation?.lng || 0,
    );

    const surgeMultiplier = Number(surge.multiplier);
    const surgeAmount = baseTotal * (surgeMultiplier - 1);
    const subtotalWithSurge = baseTotal + surgeAmount;

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
        couponDiscount = Number(couponResult.discount);
        couponCode = calculateDto.couponCode;
      } catch (error) {
        this.logger.warn(`Coupon invalid: ${error.message}`);
      }
    }

    const finalPrice = Math.max(subtotalWithSurge - couponDiscount, 0);

    return {
      basePrice: Math.round(baseFare),
      distancePrice: Math.round(distancePrice),
      timePrice: Math.round(timePrice),
      subtotal: Math.round(baseTotal),
      surgeMultiplier: surgeMultiplier,
      surgeLevel: surge.level,
      surgeAmount: Math.round(surgeAmount),
      couponDiscount: Math.round(couponDiscount),
      couponCode,
      finalPrice: Math.round(finalPrice),
      currency: this.CURRENCY,
      distance: Number(distance.toFixed(2)),
      estimatedDuration: Math.round(estimatedDuration),
      breakdown: {
        baseFare: Math.round(baseFare),
        perKm: Math.round(perKm),
        perMinute: Math.round(perMinute),
        distance: Number(distance.toFixed(2)),
        duration: Math.round(estimatedDuration),
        surgeReason: surge.reason,
      },
    };
  }

  async applyCoupon(applyDto: ApplyCouponDto): Promise<{ discount: number; finalAmount: number }> {
    this.logger.log(`Applying coupon ${applyDto.couponCode}`);

    const coupon = await this.couponRepository.findOne({
      where: { code: applyDto.couponCode.toUpperCase(), status: CouponStatus.ACTIVE },
    });

    if (!coupon) {
      throw new BadRequestException('Invalid coupon code');
    }

    const now = new Date();
    if (coupon.validFrom && now < coupon.validFrom) {
      throw new BadRequestException('Coupon not yet valid');
    }
    if (coupon.validTo && now > coupon.validTo) {
      throw new BadRequestException('Coupon expired');
    }

    if (applyDto.amount < Number(coupon.minOrderValue)) {
      throw new BadRequestException(`Minimum order value is ${Number(coupon.minOrderValue).toLocaleString()} VND`);
    }

    if (coupon.applicableVehicles?.length > 0 && applyDto.vehicleType) {
      if (!coupon.applicableVehicles.includes(applyDto.vehicleType as any)) {
        throw new BadRequestException('Coupon not applicable for this vehicle type');
      }
    }

    if (coupon.applicableUserIds?.length > 0 && applyDto.userId) {
      if (!coupon.applicableUserIds.includes(applyDto.userId)) {
        throw new BadRequestException('Coupon not applicable for this user');
      }
    }

    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    if (applyDto.userId && coupon.perUserLimit > 0) {
      const userUsageCount = await this.couponUsageRepository.count({
        where: { couponId: coupon.id, userId: applyDto.userId },
      });
      if (userUsageCount >= coupon.perUserLimit) {
        throw new BadRequestException('You have already used this coupon');
      }
    }

    const amount = Number(applyDto.amount);
    const couponValue = Number(coupon.value);
    
    let discount = 0;
    if (coupon.type === CouponType.PERCENTAGE) {
      discount = (amount * couponValue) / 100;
      if (coupon.maxDiscount && discount > Number(coupon.maxDiscount)) {
        discount = Number(coupon.maxDiscount);
      }
    } else {
      discount = couponValue;
    }

    const finalAmount = Math.max(amount - discount, 0);
    return { discount: Math.round(discount), finalAmount: Math.round(finalAmount) };
  }

  async createCoupon(createDto: CreateCouponDto): Promise<Coupon> {
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
    const prices = await this.basePriceRepository.find({ where: { isActive: true } });
    return prices.map(p => ({
      ...p,
      baseFare: Number(p.baseFare),
      perKm: Number(p.perKm),
      perMinute: Number(p.perMinute),
      minimumFare: Number(p.minimumFare),
    })) as BasePrice[];
  }

  async updateBasePrice(id: string, data: Partial<BasePrice>): Promise<BasePrice> {
    await this.basePriceRepository.update(id, data);
    const updated = await this.basePriceRepository.findOne({ where: { id } });
    if (!updated) {
      throw new NotFoundException('Base price not found');
    }
    return {
      ...updated,
      baseFare: Number(updated.baseFare),
      perKm: Number(updated.perKm),
      perMinute: Number(updated.perMinute),
      minimumFare: Number(updated.minimumFare),
    } as BasePrice;
  }

  async getAllCoupons(): Promise<Coupon[]> {
    const coupons = await this.couponRepository.find({ order: { createdAt: 'DESC' } });
    return coupons.map(c => ({
      ...c,
      value: Number(c.value),
      maxDiscount: c.maxDiscount ? Number(c.maxDiscount) : undefined,
      minOrderValue: Number(c.minOrderValue),
    })) as Coupon[];
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
    const totalDiscount = usages.reduce((sum, u) => sum + Number(u.discountAmount), 0);
    return {
      totalUses: usages.length,
      totalDiscount: Math.round(totalDiscount),
      recentUsages: usages.slice(0, 10).map(u => ({
        ...u,
        originalAmount: Number(u.originalAmount),
        discountAmount: Number(u.discountAmount),
        finalAmount: Number(u.finalAmount),
      })),
    };
  }
}