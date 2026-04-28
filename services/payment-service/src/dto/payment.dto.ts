import { IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';
import { PaymentMethod } from '../enums/payment.enum';

export class CreatePaymentDto {
  @IsString()
  rideId: string;

  @IsString()
  bookingId: string;

  @IsString()
  customerId: string;

  @IsString()
  @IsOptional()
  driverId?: string;  // Cho phép rỗng vì lúc tạo booking chưa có driver

  @IsNumber()
  @Min(0)
  amount: number;

  @IsNumber()
  @Min(0)
  discountAmount: number;

  @IsNumber()
  @Min(0)
  finalAmount: number;

  @IsString()  // Sửa từ @IsEnum thành @IsString để nhận cả string
  method: string;

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