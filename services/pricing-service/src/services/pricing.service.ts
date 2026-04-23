import { Injectable, Logger, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService, RabbitMQService } from '@cab-booking/shared';
import { ConfigService } from '@nestjs/config';
import { BasePrice } from '../entities/base-price.entity';
import { Coupon } from '../entities/coupon.entity';
import { CouponUsage } from '../entities/coupon-usage.entity';
import { DistanceService } from './distance.service';
import { AIClientService } from './ai-client.service';
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
    private distanceService: DistanceService,
    private aiClientService: AIClientService,  // Thêm AI Client
  ) {}

  async onModuleInit() {
    await new Promise(resolve => setTimeout(resolve, 3000));
    await this.initializeBasePrices();
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (retryCount < maxRetries) {
        this.logger.warn(`Failed to subscribe (attempt ${retryCount + 1}/${maxRetries}): ${message}`);
        setTimeout(() => this.subscribeWithRetry(retryCount + 1), retryDelay);
      } else {
        this.logger.error(`Failed to subscribe after ${maxRetries} attempts`);
      }
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
      this.logger.log('✅ Subscribed to booking events');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to subscribe: ${message}`);
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

  async calculatePrice(calculateDto: CalculatePriceDto): Promise<PriceResponseDto> {
    this.logger.log(`Calculating price for ${calculateDto.vehicleType}`);

    let distance = calculateDto.distance;
    let estimatedDuration = calculateDto.duration;

    // Tính khoảng cách nếu chưa có
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

    // Lấy thông tin giờ hiện tại
    const now = new Date();
    const currentHour = now.getHours();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;

    // ========== GỌI AI ĐỂ TÍNH ETA VÀ SURGE ==========
    try {
      // Gọi AI để tính ETA chính xác hơn
      const isPeakHour = (currentHour >= 7 && currentHour <= 9) || (currentHour >= 17 && currentHour <= 19);
      const trafficLevel = isPeakHour ? 0.7 : 0.4;
      
      const aiETA = await this.aiClientService.getETAFromAI(
        distance,
        trafficLevel,
        currentHour,
        isPeakHour,
      );
      if (aiETA > 0) {
        estimatedDuration = aiETA;
        this.logger.log(`AI ETA updated: ${estimatedDuration} minutes`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`AI ETA failed, using calculated duration: ${message}`);
    }

    // Lấy base price từ database
    const basePrice = await this.basePriceRepository.findOne({
      where: { vehicleType: calculateDto.vehicleType, isActive: true },
    });

    if (!basePrice) {
      throw new NotFoundException('Base price not found for this vehicle type');
    }

    const baseFare = Number(basePrice.baseFare);
    const perKm = Number(basePrice.perKm);
    const perMinute = Number(basePrice.perMinute);
    const minimumFare = Number(basePrice.minimumFare);

    const distancePrice = distance * perKm;
    const timePrice = estimatedDuration * perMinute;
    const subtotal = baseFare + distancePrice + timePrice;
    const baseTotal = Math.max(subtotal, minimumFare);

    // ========== GỌI AI ĐỂ TÍNH SURGE MULTIPLIER ==========
    let surgeMultiplier = 1.0;
    let surgeLevel = 'normal';
    let surgeReason = 'Bình thường';

    try {
      const demandIndex = this.calculateDemandIndex(currentHour, isWeekend);
      const supplyIndex = await this.getSupplyIndex(calculateDto.pickupLocation?.lat || 0, calculateDto.pickupLocation?.lng || 0);
      
      const aiSurge = await this.aiClientService.getSurgeFromAI(
        demandIndex,
        supplyIndex,
        currentHour,
        isWeekend,
      );
      surgeMultiplier = aiSurge;
      
      // Xác định level và reason từ multiplier
      if (surgeMultiplier >= 2.5) surgeLevel = 'peak';
      else if (surgeMultiplier >= 2.0) surgeLevel = 'high';
      else if (surgeMultiplier >= 1.5) surgeLevel = 'medium';
      else if (surgeMultiplier >= 1.2) surgeLevel = 'low';
      else surgeLevel = 'normal';
      
      surgeReason = surgeMultiplier > 1.5 ? 'Nhu cầu cao, thiếu tài xế' : 'Bình thường';
      
      this.logger.log(`AI Surge: ${surgeMultiplier}x (${surgeLevel})`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`AI Surge failed, using default multiplier: ${message}`);
    }

    const surgeAmount = baseTotal * (surgeMultiplier - 1);
    const subtotalWithSurge = baseTotal + surgeAmount;

    // Xử lý coupon
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
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Coupon invalid: ${message}`);
      }
    }

    const finalPrice = Math.max(subtotalWithSurge - couponDiscount, 0);

    return {
      basePrice: Math.round(baseFare),
      distancePrice: Math.round(distancePrice),
      timePrice: Math.round(timePrice),
      subtotal: Math.round(baseTotal),
      surgeMultiplier: surgeMultiplier,
      surgeLevel: surgeLevel,
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
        surgeReason: surgeReason,
      },
    };
  }

  // Helper methods
  private calculateDemandIndex(hour: number, isWeekend: boolean): number {
    let demand = 1.0;
    if (hour >= 7 && hour <= 9) demand = 2.0;
    else if (hour >= 17 && hour <= 19) demand = 2.5;
    else if (hour >= 11 && hour <= 13) demand = 1.5;
    else if (hour >= 22 || hour <= 5) demand = 0.5;
    
    if (isWeekend && (hour >= 18 && hour <= 22)) demand *= 1.3;
    return demand;
  }

  private async getSupplyIndex(lat: number, lng: number): Promise<number> {
    try {
      const redisClient = this.redisService.getClient();
      const nearbyDrivers = await redisClient.georadius(
        'driver:locations',
        lng,
        lat,
        2000,
        'm',
      );
      const driverCount = nearbyDrivers.length;
      if (driverCount >= 10) return 1.5;
      if (driverCount >= 5) return 1.0;
      if (driverCount >= 2) return 0.6;
      return 0.3;
    } catch (error) {
      return 1.0;
    }
  }

  // Các methods còn lại giữ nguyên...
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