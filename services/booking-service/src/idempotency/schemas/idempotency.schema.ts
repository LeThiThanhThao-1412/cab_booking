import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ 
  timestamps: true,
  expires: 86400 // TTL 24 giờ
})
export class IdempotencyRecord extends Document {
  @Prop({ required: true, index: true })
  customerId: string;

  @Prop({ required: true, index: true })
  key: string;

  @Prop({ required: true })
  bookingId: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const IdempotencyRecordSchema = SchemaFactory.createForClass(IdempotencyRecord);

// Unique composite index để đảm bảo không trùng
IdempotencyRecordSchema.index({ customerId: 1, key: 1 }, { unique: true });