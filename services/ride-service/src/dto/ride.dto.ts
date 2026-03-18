import { IsString, IsNumber, IsEnum, IsOptional, IsLatitude, IsLongitude, Min, Max } from 'class-validator';
import { RideStatus } from '../schemas/ride.schema';

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
}

export class UpdateStatusDto {
  @IsEnum(['en_route_to_pickup', 'arrived_at_pickup', 'in_progress', 'completed', 'cancelled'])
  status: string;

  @IsOptional()
  @IsString()
  reason?: string;  // Lý do hủy
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

export class RideResponseDto {
  id: string;
  bookingId: string;
  customerId: string;
  driverId: string;
  pickupLocation: any;
  dropoffLocation: any;
  waypoints: any[];
  status: string;
  price: any;
  distance: number;
  duration: number;
  driverAcceptedAt?: Date;
  driverArrivedAt?: Date;
  rideStartedAt?: Date;
  rideCompletedAt?: Date;
  trackingPath: any[];
  cancellation?: any;
  isPaid: boolean;
  createdAt: Date;
  updatedAt: Date;
}