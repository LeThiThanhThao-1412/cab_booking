import { IsString, IsNumber, IsEnum, IsOptional, IsUUID, Min, Max } from 'class-validator';
import { PaymentMethod } from '../enums/payment.enum';

export class CreatePaymentDto {
  @IsUUID()
  rideId: string;

  @IsUUID()
  bookingId: string;

  @IsUUID()
  customerId: string;

  @IsUUID()
  driverId: string;

  @IsNumber()
  @Min(1000)
  amount: number;

  @IsNumber()
  @Min(0)
  discountAmount: number;

  @IsNumber()
  @Min(1000)
  finalAmount: number;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  metadata?: any;
}

export class ApplyCouponDto {
  @IsString()
  couponCode: string;

  @IsNumber()
  @Min(1000)
  amount: number;
}

export class CouponResponseDto {
  code: string;
  type: string;
  value: number;
  maxDiscount: number;
  minOrderValue: number;
  description: string;
}

export class PaymentResponseDto {
  id: string;
  transactionId: string;
  rideId: string;
  bookingId: string;
  customerId: string;
  driverId: string;
  amount: number;
  discountAmount: number;
  finalAmount: number;
  method: string;
  status: string;
  couponCode?: string;
  paidAt?: Date;
  createdAt: Date;
}