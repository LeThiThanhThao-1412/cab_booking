import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ReviewType, ReviewStatus, FlagReason } from '../enums/review.enum';

export type ReviewDocument = Review & Document;

@Schema({ timestamps: true, collection: 'reviews' })
export class Review {
  @Prop({ required: true, index: true })
  rideId!: string;

  @Prop({ required: true, index: true })
  bookingId!: string;

  @Prop({ required: true, index: true })
  reviewerId!: string;  // Người đánh giá

  @Prop({ required: true, index: true })
  revieweeId!: string;  // Người được đánh giá

  @Prop({ required: true, type: String, enum: ReviewType })
  type!: ReviewType;

  @Prop({ required: true, min: 1, max: 5 })
  rating!: number;

  @Prop({ type: Object, default: {} })
  dimensionRatings?: {
    driving_skill?: number;
    punctuality?: number;
    vehicle_cleanliness?: number;
    attitude?: number;
    comfort?: number;
  };

  @Prop({ maxlength: 1000 })
  comment?: string;

  @Prop({ type: [String], default: [] })
  tags?: string[];  // Ví dụ: ['friendly', 'on_time', 'clean_car']

  @Prop({ type: [String], default: [] })
  images?: string[];  // URLs của ảnh đính kèm

  @Prop({ type: String, enum: ReviewStatus, default: ReviewStatus.PUBLISHED })
  status!: ReviewStatus;

  @Prop({ type: Object, default: {} })
  flag?: {
    reason: FlagReason;
    description: string;
    flaggedBy: string;
    flaggedAt: Date;
    resolvedBy?: string;
    resolvedAt?: Date;
    resolution?: string;
  };

  @Prop({ default: 0 })
  helpfulCount!: number;  // Số người thấy hữu ích

  @Prop({ default: 0 })
  reportCount!: number;   // Số lần bị báo cáo

  @Prop({ type: Object, default: {} })
  metadata?: {
    deviceInfo?: string;
    ipAddress?: string;
    location?: string;
  };

  @Prop({ type: Date, default: Date.now })
  createdAt!: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt!: Date;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

// Indexes
ReviewSchema.index({ rideId: 1 });
ReviewSchema.index({ bookingId: 1 });
ReviewSchema.index({ reviewerId: 1, createdAt: -1 });
ReviewSchema.index({ revieweeId: 1, createdAt: -1 });
ReviewSchema.index({ rating: 1, createdAt: -1 });
ReviewSchema.index({ status: 1, createdAt: -1 });