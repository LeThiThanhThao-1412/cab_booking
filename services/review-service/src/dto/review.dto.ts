import { 
  IsString, 
  IsNumber, 
  IsEnum, 
  IsOptional, 
  IsArray,
  IsUUID,
  Min, 
  Max, 
  ArrayMaxSize,
  IsObject,
  MaxLength 
} from 'class-validator';
import { ReviewType, FlagReason } from '../enums/review.enum';

export class CreateReviewDto {
  @IsUUID()
  rideId!: string;

  @IsUUID()
  bookingId!: string;

  @IsEnum(ReviewType)
  type!: ReviewType;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsObject()
  dimensionRatings?: {
    driving_skill?: number;
    punctuality?: number;
    vehicle_cleanliness?: number;
    attitude?: number;
    comfort?: number;
  };

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  tags?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  images?: string[];
}

export class UpdateReviewDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];
}

export class FlagReviewDto {
  @IsEnum(FlagReason)
  reason!: FlagReason;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class ReviewResponseDto {
  id!: string;
  rideId!: string;
  bookingId!: string;
  reviewerId!: string;
  revieweeId!: string;
  type!: string;
  rating!: number;
  dimensionRatings?: any;
  comment?: string;
  tags?: string[];
  images?: string[];
  status!: string;
  helpfulCount!: number;
  createdAt!: Date;
  updatedAt!: Date;
}

export class ReviewStatsResponseDto {
  averageRating!: number;
  totalReviews!: number;
  ratingDistribution!: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  dimensionAverages?: {
    driving_skill?: number;
    punctuality?: number;
    vehicle_cleanliness?: number;
    attitude?: number;
    comfort?: number;
  };
  recentReviews!: ReviewResponseDto[];
}