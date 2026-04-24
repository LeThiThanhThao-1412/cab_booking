import { IsString, IsNumber, IsEnum, IsOptional, IsUUID, Min, Max, IsLatitude, IsLongitude, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleType } from '../enums/pricing.enum';

export class LocationDto {
  @IsLatitude()
  lat: number;

  @IsLongitude()
  lng: number;

  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class CalculatePriceDto {
  @IsEnum(VehicleType)
  vehicleType: VehicleType;

  @ValidateNested()
  @Type(() => LocationDto)
  pickupLocation: LocationDto;

  @ValidateNested()
  @Type(() => LocationDto)
  dropoffLocation: LocationDto;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  distance?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  duration?: number;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  // ✅ THÊM CÁC FIELD NÀY CHO TEST TC16
  @IsOptional()
  @IsNumber()
  @Min(0)
  demand_index?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  supply_index?: number;
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
  distance: number;
  estimatedDuration: number;
  breakdown: {
    baseFare: number;
    perKm: number;
    perMinute: number;
    distance: number;
    duration: number;
    surgeReason?: string;
  };
}