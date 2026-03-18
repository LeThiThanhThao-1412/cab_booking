import { IsString, IsNumber, IsOptional, IsArray, IsLatitude, IsLongitude, Min, Max } from 'class-validator';

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


export class DriverScoreDto {
  driverId: string;
  score: number;
  distance: number;
  rating: number;
  totalTrips: number;
  acceptanceRate: number;
  reason?: string;
}

export class MatchingRequestDto {
  bookingId: string;
  customerId: string;
  pickupLocation: {
    lat: number;
    lng: number;
    address?: string;
  };
  dropoffLocation: {
    lat: number;
    lng: number;
    address?: string;
  };
  vehicleType: string;
  distance: number;
  estimatedPrice?: any; // Thêm dòng này để hết lỗi
  searchRadius?: number;
}