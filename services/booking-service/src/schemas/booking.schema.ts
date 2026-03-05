import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BookingDocument = Booking & Document;

export enum BookingStatus {
  PENDING = 'pending',           // Đang tìm tài xế
  CONFIRMED = 'confirmed',       // Tài xế đã nhận
  PICKING_UP = 'picking_up',     // Đang đến đón
  IN_PROGRESS = 'in_progress',   // Đang chở khách
  COMPLETED = 'completed',       // Hoàn thành
  CANCELLED = 'cancelled',       // Đã hủy
  NO_DRIVER = 'no_driver',       // Không tìm thấy tài xế
}

export enum VehicleType {
  CAR_4 = 'car_4',
  CAR_7 = 'car_7',
  MOTORBIKE = 'motorbike',
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  WALLET = 'wallet',
}

export interface Location {
  lat: number;
  lng: number;
  address: string;
  name?: string;
}

export interface PriceDetail {
  basePrice: number;
  distancePrice: number;
  timePrice: number;
  surgeMultiplier: number;
  total: number;
  currency: string;
}

export interface TrackingPoint {
  lat: number;
  lng: number;
  timestamp: Date;
  speed?: number;
  heading?: number;
}

@Schema({ timestamps: true, collection: 'bookings' })
export class Booking {
  @Prop({ required: true, index: true })
  customerId: string;

  @Prop({ index: true })
  driverId: string;

  @Prop({ required: true, type: Object })
  pickupLocation: Location;

  @Prop({ required: true, type: Object })
  dropoffLocation: Location;

  @Prop({ type: Array })
  waypoints: Location[];

  @Prop({ required: true, type: String, enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus;

  @Prop({ required: true, type: String, enum: VehicleType })
  vehicleType: VehicleType;

  @Prop({ type: Object })
  price: PriceDetail;

  @Prop({ required: true })
  distance: number; // km

  @Prop()
  duration: number; // phút

  @Prop({ type: String, enum: PaymentMethod, default: PaymentMethod.CASH })
  paymentMethod: PaymentMethod;

  @Prop({ type: Object })
  estimatedPrice: {
    amount: number;
    distance: number;
    duration: number;
  };

  @Prop({ type: Date })
  pickupTime: Date;

  @Prop({ type: Date })
  startTime: Date;

  @Prop({ type: Date })
  endTime: Date;

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

export const BookingSchema = SchemaFactory.createForClass(Booking);

// Tạo indexes
BookingSchema.index({ customerId: 1, createdAt: -1 });
BookingSchema.index({ driverId: 1, status: 1 });
BookingSchema.index({ status: 1, createdAt: 1 });
BookingSchema.index({ 'pickupLocation.lat': 1, 'pickupLocation.lng': 1 });