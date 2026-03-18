import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RideDocument = Ride & Document;

export enum RideStatus {
  PENDING = 'pending',              // Chờ tài xế nhận
  EN_ROUTE_TO_PICKUP = 'en_route_to_pickup', // Đang đến đón
  ARRIVED_AT_PICKUP = 'arrived_at_pickup',   // Đã đến điểm đón
  IN_PROGRESS = 'in_progress',       // Đang chở khách
  COMPLETED = 'completed',           // Hoàn thành
  CANCELLED = 'cancelled',           // Đã hủy
}

export interface Location {
  lat: number;
  lng: number;
  address: string;
}

export interface TrackingPoint {
  lat: number;
  lng: number;
  timestamp: Date;
  speed?: number;
  heading?: number;
  accuracy?: number;
}

@Schema({ timestamps: true, collection: 'rides' })
export class Ride {
  @Prop({ required: true, index: true })
  bookingId: string;  // ID từ booking-service

  @Prop({ required: true, index: true })
  customerId: string;

  @Prop({ required: true, index: true })
  driverId: string;

  @Prop({ required: true, type: Object })
  pickupLocation: Location;

  @Prop({ required: true, type: Object })
  dropoffLocation: Location;

  @Prop({ type: Array })
  waypoints: Location[];

  @Prop({ required: true, type: String, enum: RideStatus, default: RideStatus.PENDING })
  status: RideStatus;

  @Prop({ type: Object })
  price: {
    basePrice: number;
    distancePrice: number;
    timePrice: number;
    surgeMultiplier: number;
    total: number;
    currency: string;
  };

  @Prop()
  distance: number;  // km

  @Prop()
  duration: number;  // phút

  @Prop({ type: Date })
  driverAcceptedAt: Date;

  @Prop({ type: Date })
  driverArrivedAt: Date;

  @Prop({ type: Date })
  rideStartedAt: Date;

  @Prop({ type: Date })
  rideCompletedAt: Date;

  @Prop({ type: Array })
  trackingPath: TrackingPoint[];

  @Prop({ type: Object })
  cancellation: {
    cancelledBy: 'customer' | 'driver' | 'system';
    reason: string;
    cancelledAt: Date;
  };

  @Prop({ type: Object })
  rating: {
    customerRating: number;
    driverRating: number;
    customerFeedback: string;
    driverFeedback: string;
  };

  @Prop({ default: false })
  isPaid: boolean;

  @Prop()
  paymentId: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const RideSchema = SchemaFactory.createForClass(Ride);

// Indexes
RideSchema.index({ customerId: 1, createdAt: -1 });
RideSchema.index({ driverId: 1, status: 1 });
RideSchema.index({ status: 1, createdAt: 1 });