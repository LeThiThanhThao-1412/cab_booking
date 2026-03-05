import { IsString, IsOptional, IsDateString, IsEnum, IsObject, IsArray, IsNumber, Min, Max } from 'class-validator';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsObject()
  preferences?: {
    language?: string;
    notificationEnabled?: boolean;
    darkMode?: boolean;
  };
}

export class SavedPlaceDto {
  @IsString()
  name: string;

  @IsString()
  address: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
}

export class UserProfileResponseDto {
  id: string;
  userId: string;
  fullName: string;
  avatar: string;
  dateOfBirth: Date;
  gender: string;
  address: string;
  savedPlaces: Array<{
    name: string;
    address: string;
    lat: number;
    lng: number;
  }>;
  preferences: {
    language?: string;
    notificationEnabled?: boolean;
    darkMode?: boolean;
  };
  totalTrips: number;
  averageRating: number;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}