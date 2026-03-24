import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RideDocument = Ride & Document;

export enum RideStatus {
  PENDING = 'pending',
  EN_ROUTE_TO_PICKUP = 'en_route_to_pickup',
  ARRIVED_AT_PICKUP = 'arrived_at_pickup',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface Location {
  lat: number;
  lng: number;
  address: string;
  name?: string;
}

export interface TrackingPoint {
  lat: number;
  lng: number;
  timestamp: Date;
  speed?: number;
  heading?: number;
  accuracy?: number;
}

export interface PriceDetail {
  basePrice: number;
  distancePrice: number;
  timePrice: number;
  surgeMultiplier: number;
  total: number;
  currency: string;
}

@Schema({ timestamps: true, collection: 'rides' })
export class Ride {
  @Prop({ required: true })
  bookingId: string;

  @Prop({ required: true })
  customerId: string;

  @Prop({ required: true })
  driverId: string;

  @Prop({ required: true, type: Object })
  pickupLocation: Location;

  @Prop({ required: true, type: Object })
  dropoffLocation: Location;

  @Prop({ type: [Object], default: [] })
  waypoints: Location[];

  @Prop({ required: true, type: String, enum: RideStatus, default: RideStatus.PENDING })
  status: RideStatus;

  @Prop({ type: Object })
  price: PriceDetail;

  @Prop({ default: 0 })
  distance: number;

  @Prop({ default: 0 })
  duration: number;

  @Prop()
  estimatedDuration: number;

  @Prop()
  estimatedDistance: number;

  @Prop()
  driverAcceptedAt: Date;

  @Prop()
  driverArrivedAt: Date;

  @Prop()
  rideStartedAt: Date;

  @Prop()
  rideCompletedAt: Date;

  @Prop({ type: [Object], default: [] })
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

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const RideSchema = SchemaFactory.createForClass(Ride);

// Indexes cho query nhanh - chỉ khai báo ở đây, không dùng index:true trong Prop
RideSchema.index({ bookingId: 1 });
RideSchema.index({ customerId: 1, createdAt: -1 });
RideSchema.index({ driverId: 1, status: 1 });
RideSchema.index({ status: 1, createdAt: 1 });
RideSchema.index({ driverId: 1, status: 1, createdAt: -1 });