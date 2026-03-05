import { 
  IsString, 
  IsOptional, 
  IsNumber, 
  IsEnum, 
  IsLatitude, 
  IsLongitude,
  Min,
  Max 
} from 'class-validator';
import { VehicleType } from '../entities/driver.entity';

export class UpdateDriverDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @IsOptional()
  @IsString()
  vehicleModel?: string;

  @IsOptional()
  @IsString()
  vehicleColor?: string;

  @IsOptional()
  @IsString()
  vehiclePlate?: string;

  @IsOptional()
  @IsNumber()
  @Min(2000)
  @Max(new Date().getFullYear())
  vehicleYear?: number;
}

export class DriverLocationDto {
  @IsLatitude()
  latitude: number;

  @IsLongitude()
  longitude: number;
}

export class UpdateStatusDto {
  @IsEnum(['online', 'offline', 'busy'])
  status: string;
}

export class DriverResponseDto {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  avatar: string;
  status: string;
  vehicleType: string;
  vehicleModel: string;
  vehicleColor: string;
  vehiclePlate: string;
  totalTrips: number;
  rating: number;
  currentLocation?: {
    lat: number;
    lng: number;
    updatedAt: Date;
  };
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}