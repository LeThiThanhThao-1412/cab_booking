import { 
  IsString, 
  IsNumber, 
  IsEnum, 
  IsObject, 
  IsOptional,
  IsLatitude,
  IsLongitude,
  Min,
  Max,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleType, PaymentMethod } from '../schemas/booking.schema';

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

export class CreateBookingDto {
  @ValidateNested()
  @Type(() => LocationDto)
  pickupLocation: LocationDto;

  @ValidateNested()
  @Type(() => LocationDto)
  dropoffLocation: LocationDto;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => LocationDto)
  waypoints?: LocationDto[];

  @IsEnum(VehicleType)
  vehicleType: VehicleType;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;
  
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(1000)
  distance?: number; // km

  @IsOptional()
  @IsNumber()
  @Min(1)
  duration?: number; // phút
}

export class AcceptBookingDto {
  @IsString()
  driverId: string;

  @IsNumber()
  @IsOptional()
  eta?: number; // phút
}

export class UpdateStatusDto {
  @IsEnum(['picking_up', 'in_progress', 'completed', 'cancelled'])
  status: string;

  @IsOptional()
  @IsString()
  reason?: string; // lý do hủy
}

export class TrackingPointDto {
  @IsLatitude()
  lat: number;

  @IsLongitude()
  lng: number;

  @IsOptional()
  @IsNumber()
  speed?: number;

  @IsOptional()
  @IsNumber()
  heading?: number;
}

export class UpdateLocationDto {
  @ValidateNested()
  @Type(() => TrackingPointDto)
  location: TrackingPointDto;
}

export class BookingResponseDto {
  id: string;
  customerId: string;
  driverId?: string;
  pickupLocation: LocationDto;
  dropoffLocation: LocationDto;
  waypoints?: LocationDto[];
  status: string;
  vehicleType: string;
  price: any;
  distance?: number;
  duration?: number;
  paymentMethod: string;
  estimatedPrice?: any;
  pickupTime?: Date;
  startTime?: Date;
  endTime?: Date;
  trackingPath?: any[];
  cancellation?: any;
  createdAt: Date;
  updatedAt: Date;
}