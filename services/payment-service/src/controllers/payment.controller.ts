import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PaymentService } from '../services/payment.service';
import { ApplyCouponDto, PaymentResponseDto } from '../dto/payment.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('ride/:rideId')
  async getPaymentByRideId(@Param('rideId') rideId: string): Promise<PaymentResponseDto> {
    return this.paymentService.getPaymentByRideId(rideId);
  }

  @Get('transaction/:transactionId')
  async getPaymentByTransactionId(@Param('transactionId') transactionId: string): Promise<PaymentResponseDto> {
    return this.paymentService.getPaymentByTransactionId(transactionId);
  }

  @Post('apply-coupon')
  async applyCoupon(@Body() applyDto: ApplyCouponDto) {
    return this.paymentService.applyCoupon(applyDto.couponCode, applyDto.amount);
  }

  @Post(':paymentId/refund')
  async refundPayment(
    @Param('paymentId') paymentId: string,
    @Body('reason') reason: string,
  ): Promise<PaymentResponseDto> {
    return this.paymentService.refundPayment(paymentId, reason);
  }
}