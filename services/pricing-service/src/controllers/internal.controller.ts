import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { InternalAuthGuard } from '@cab-booking/shared';
import { PricingService } from '../services/pricing.service';
import { CalculatePriceDto } from '../dto/pricing.dto';

@Controller('internal')
@UseGuards(InternalAuthGuard)
export class InternalController {
  constructor(private readonly pricingService: PricingService) {}

  @Post('calculate')
  async calculatePrice(@Body() calculateDto: CalculatePriceDto) {
    return this.pricingService.calculatePrice(calculateDto);
  }

  @Get('coupons/:code/validate')
  async validateCoupon(@Param('code') code: string, @Body('amount') amount: number) {
    return this.pricingService.applyCoupon({ couponCode: code, amount });
  }

  @Get('base-prices')
  async getBasePrices() {
    return this.pricingService.getBasePrices();
  }

  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'pricing-service',
      timestamp: new Date().toISOString(),
    };
  }
}