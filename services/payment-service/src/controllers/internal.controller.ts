import {
  Controller,
  Get,
  Post,
  Body,
  Param,
} from '@nestjs/common';
import { PaymentService } from '../services/payment.service';
import { CreatePaymentDto } from '../dto/payment.dto';

@Controller('internal')
export class InternalController {
  constructor(private readonly paymentService: PaymentService) {}

  // Tạo payment record PENDING (gọi từ Booking Service)
  @Post('create')
  async createPayment(@Body() createDto: CreatePaymentDto) {
    return this.paymentService.createPaymentRecord(createDto);
  }

  // Xử lý thanh toán thật (gọi từ Ride Service khi hoàn thành)
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