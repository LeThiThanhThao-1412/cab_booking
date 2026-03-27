import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PricingService } from '../services/pricing.service';
import { CalculatePriceDto, ApplyCouponDto, CreateCouponDto, PriceResponseDto } from '../dto/pricing.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('pricing')
@UseGuards(JwtAuthGuard)
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post('calculate')
  async calculatePrice(@Body() calculateDto: CalculatePriceDto): Promise<PriceResponseDto> {
    return this.pricingService.calculatePrice(calculateDto);
  }

  @Post('apply-coupon')
  async applyCoupon(@Body() applyDto: ApplyCouponDto) {
    return this.pricingService.applyCoupon(applyDto);
  }

  @Get('base-prices')
  async getBasePrices() {
    return this.pricingService.getBasePrices();
  }

  @Get('coupons')
  async getAllCoupons() {
    return this.pricingService.getAllCoupons();
  }

  @Post('coupons')
  async createCoupon(@Body() createDto: CreateCouponDto) {
    return this.pricingService.createCoupon(createDto);
  }

  @Put('base-prices/:id')
  async updateBasePrice(@Param('id') id: string, @Body() data: any) {
    return this.pricingService.updateBasePrice(id, data);
  }

  @Delete('coupons/:id')
  async disableCoupon(@Param('id') id: string) {
    await this.pricingService.disableCoupon(id);
    return { message: 'Coupon disabled successfully' };
  }

  @Get('coupons/:id/stats')
  async getCouponStats(@Param('id') id: string) {
    return this.pricingService.getCouponUsageStats(id);
  }
}