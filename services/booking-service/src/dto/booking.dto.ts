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
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleType, PaymentMethod } from '../schemas/booking.schema';

export class LocationDto {
  @IsLatitude({ message: 'lat must be a valid latitude number' })
  lat: number;

  @IsLongitude({ message: 'lng must be a valid longitude number' })
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
  @IsNotEmpty({ message: 'pickupLocation is required' })
  pickupLocation: LocationDto;

  @ValidateNested()
  @Type(() => LocationDto)
  @IsNotEmpty({ message: 'dropoffLocation is required' })
  dropoffLocation: LocationDto;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => LocationDto)
  waypoints?: LocationDto[];

  @IsEnum(VehicleType)
  vehicleType: VehicleType;

  @IsString()  // ← SỬA THÀNH @IsString() để nhận mọi loại payment method
  @IsOptional()
  paymentMethod?: string;
  
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(1000)
  distance?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  duration?: number;
}

export class AcceptBookingDto {
  @IsString()
  driverId: string;

  @IsNumber()
  @IsOptional()
  eta?: number;
}

export class UpdateStatusDto {
  @IsEnum(['picking_up', 'in_progress', 'completed', 'cancelled'])
  status: string;

  @IsOptional()
  @IsString()
  reason?: string;
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
  driverId?: string | null;
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
  pickupTime?: Date | null;
  startTime?: Date | null;
  endTime?: Date | null;
  trackingPath?: any[];
  cancellation?: any;
  payment?: {                   // ← THÊM FIELD NÀY
    id: string | null;
    status: string;
    amount: number;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}