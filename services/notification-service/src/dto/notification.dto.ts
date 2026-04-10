import { IsString, IsEnum, IsOptional, IsObject, IsUUID, IsArray } from 'class-validator';
import { NotificationType, NotificationChannel, NotificationPriority } from '../enums/notification.enum';

export class CreateNotificationDto {
  @IsUUID()
  userId!: string;

  @IsEnum(NotificationType)
  type!: NotificationType;

  @IsString()
  title!: string;

  @IsString()
  body!: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsObject()
  metadata?: {
    deviceToken?: string;
    phoneNumber?: string;
    email?: string;
  };
}

export class SendBulkNotificationDto {
  @IsArray()
  @IsUUID('4', { each: true })
  userIds!: string[];

  @IsEnum(NotificationType)
  type!: NotificationType;

  @IsString()
  title!: string;

  @IsString()
  body!: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;
}

export class MarkAsReadDto {
  @IsArray()
  @IsUUID('4', { each: true })
  notificationIds!: string[];
}

export class NotificationResponseDto {
  id!: string;
  userId!: string;
  type!: string;
  title!: string;
  body!: string;
  data!: any;
  channel!: string;
  priority!: string;
  status!: string;
  isRead!: boolean;
  sentAt?: Date;
  readAt?: Date;
  createdAt!: Date;
}