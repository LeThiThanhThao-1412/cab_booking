import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { InternalAuthGuard } from '@cab-booking/shared';
import { PaymentService } from '../services/payment.service';
import { CreatePaymentDto } from '../dto/payment.dto';

@Controller('internal')
@UseGuards(InternalAuthGuard)
export class InternalController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('process')
  async processPayment(@Body() createDto: CreatePaymentDto) {
    return this.paymentService.processPayment(createDto);
  }

  @Get('ride/:rideId')
  async getPaymentByRideId(@Param('rideId') rideId: string) {
    return this.paymentService.getPaymentByRideId(rideId);
  }

  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'payment-service',
      timestamp: new Date().toISOString(),
    };
  }
}