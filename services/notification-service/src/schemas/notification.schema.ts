import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { NotificationType, NotificationChannel, NotificationPriority, NotificationStatus } from '../enums/notification.enum';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, type: String, enum: NotificationType })
  type: NotificationType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  body: string;

  @Prop({ type: Object, default: {} })
  data: Record<string, any>;

  @Prop({ type: String, enum: NotificationChannel, default: NotificationChannel.PUSH })
  channel: NotificationChannel;

  @Prop({ type: String, enum: NotificationPriority, default: NotificationPriority.NORMAL })
  priority: NotificationPriority;

  @Prop({ type: String, enum: NotificationStatus, default: NotificationStatus.PENDING })
  status: NotificationStatus;

  @Prop()
  sentAt: Date;

  @Prop()
  deliveredAt: Date;

  @Prop()
  readAt: Date;

  @Prop({ type: Object, default: {} })
  metadata: {
    deviceToken?: string;
    phoneNumber?: string;
    email?: string;
    error?: string;
    attempts?: number;
  };

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Indexes
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });
NotificationSchema.index({ status: 1, createdAt: 1 });
NotificationSchema.index({ type: 1, createdAt: -1 });