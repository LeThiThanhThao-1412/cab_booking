import { IsString, IsNumber, IsEnum, IsOptional, IsUUID, Min, Max } from 'class-validator';
import { VehicleType } from '../enums/pricing.enum';

export class CalculatePriceDto {
  @IsEnum(VehicleType)
  vehicleType: VehicleType;

  @IsNumber()
  @Min(0.1)
  distance: number; // km

  @IsNumber()
  @Min(1)
  duration: number; // phút

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class ApplyCouponDto {
  @IsString()
  couponCode: string;

  @IsNumber()
  @Min(1000)
  amount: number;

  @IsOptional()
  @IsString()
  vehicleType?: VehicleType;

  @IsOptional()
  @IsString()
  zone?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class CreateCouponDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(['percentage', 'fixed'])
  type: string;

  @IsNumber()
  @Min(0)
  value: number;

  @IsOptional()
  @IsNumber()
  maxDiscount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderValue?: number;

  @IsOptional()
  applicableVehicles?: string[];

  @IsOptional()
  applicableZones?: string[];

  @IsOptional()
  @IsNumber()
  usageLimit?: number;

  @IsOptional()
  @IsNumber()
  perUserLimit?: number;

  @IsOptional()
  validFrom?: Date;

  @IsOptional()
  validTo?: Date;
}

export class PriceResponseDto {
  basePrice: number;
  distancePrice: number;
  timePrice: number;
  subtotal: number;
  surgeMultiplier: number;
  surgeLevel: string;
  surgeAmount: number;
  couponDiscount: number;
  couponCode?: string;
  finalPrice: number;
  currency: string;
  breakdown: {
    baseFare: number;
    perKm: number;
    perMinute: number;
    distance: number;
    duration: number;
    surgeReason?: string;
  };
}