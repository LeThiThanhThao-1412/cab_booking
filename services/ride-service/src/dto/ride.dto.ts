import { IsString, IsNumber, IsEnum, IsOptional, IsLatitude, IsLongitude, Min, Max } from 'class-validator';
import { RideStatus } from '../schemas/ride.schema';

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

export class UpdateLocationDto {
  @IsLatitude()
  lat: number;

  @IsLongitude()
  lng: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(200)
  speed?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(360)
  heading?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracy?: number;
}

export class UpdateStatusDto {
  @IsEnum(['en_route_to_pickup', 'arrived_at_pickup', 'in_progress', 'completed', 'cancelled'])
  status: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class RateRideDto {
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}

// Thêm DTO cho Rating
export class RatingDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  customerRating?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  driverRating?: number;

  @IsOptional()
  @IsString()
  customerFeedback?: string;

  @IsOptional()
  @IsString()
  driverFeedback?: string;
}

export class RideResponseDto {
  id: string;
  bookingId: string;
  customerId: string;
  driverId: string;
  pickupLocation: LocationDto;
  dropoffLocation: LocationDto;
  waypoints: LocationDto[];
  status: string;
  price: any;
  distance: number;
  duration: number;
  estimatedDuration?: number;
  estimatedDistance?: number;
  driverAcceptedAt?: Date;
  driverArrivedAt?: Date;
  rideStartedAt?: Date;
  rideCompletedAt?: Date;
  trackingPath: any[];
  cancellation?: any;
  isPaid: boolean;
  rating?: RatingDto;  // THÊM DÒNG NÀY
  createdAt: Date;
  updatedAt: Date;
}