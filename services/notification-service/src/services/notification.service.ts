import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RabbitMQService } from '@cab-booking/shared';
import { ConfigService } from '@nestjs/config';
import { Notification, NotificationDocument } from '../schemas/notification.schema';
import { CreateNotificationDto, SendBulkNotificationDto, NotificationResponseDto } from '../dto/notification.dto';
import { NotificationChannel, NotificationStatus, NotificationPriority, NotificationType } from '../enums/notification.enum';
import { NotificationGateway } from '../gateways/notification.gateway';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { PushService } from './push.service';

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    private rabbitMQService: RabbitMQService,
    private configService: ConfigService,
    private notificationGateway: NotificationGateway,
    private emailService: EmailService,
    private smsService: SmsService,
    private pushService: PushService,
  ) {}

  async onModuleInit() {
    await this.subscribeToEvents();
  }

  async subscribeToEvents() {
    const events = [
      { exchange: 'auth.events', routingKey: 'auth.user.registered' },
      { exchange: 'auth.events', routingKey: 'auth.user.login' },
      { exchange: 'booking.events', routingKey: 'booking.created' },
      { exchange: 'booking.events', routingKey: 'booking.accepted' },
      { exchange: 'booking.events', routingKey: 'booking.cancelled' },
      { exchange: 'ride.events', routingKey: 'ride.started' },
      { exchange: 'ride.events', routingKey: 'ride.completed' },
      { exchange: 'ride.events', routingKey: 'ride.cancelled' },
      { exchange: 'payment.events', routingKey: 'payment.completed' },
      { exchange: 'payment.events', routingKey: 'payment.failed' },
      { exchange: 'driver.events', routingKey: 'driver.approved' },
    ];

    for (const { exchange, routingKey } of events) {
      await this.rabbitMQService.subscribe(
        'notification-service.queue',
        async (msg: any) => {
          await this.handleEvent(msg, routingKey);
        },
        { exchange, routingKey },
      );
    }

    this.logger.log('✅ Subscribed to all events');
  }

  private getUserId(data: any, eventName: string): string | null {
    const userId = data.customerId || data.userId || data.driverId || data.id || data.sub;
    if (!userId) {
      this.logger.warn(`${eventName} event missing userId: ${JSON.stringify(data)}`);
      return null;
    }
    return userId;
  }

  private getFullName(data: any): string {
    return data.fullName || data.name || data.customerName || data.driverName || 'bạn';
  }

  async handleEvent(event: any, routingKey: string) {
    this.logger.log(`Processing event: ${routingKey}`);
    const data = event.data || event;

    let notification: CreateNotificationDto | null = null;

    switch (routingKey) {
      case 'auth.user.registered': {
        const userId = this.getUserId(data, 'auth.user.registered');
        if (!userId) return;
        notification = {
          userId: userId,
          type: NotificationType.ACCOUNT_VERIFIED,
          title: 'Chào mừng đến với CAB Booking!',
          body: `Chào ${this.getFullName(data)}, chúc mừng bạn đã đăng ký thành công tài khoản.`,
          data: { userId: userId },
          priority: NotificationPriority.HIGH,
        };
        break;
      }

      case 'auth.user.login': {
        const userId = this.getUserId(data, 'auth.user.login');
        if (!userId) return;
        notification = {
          userId: userId,
          type: NotificationType.ACCOUNT_VERIFIED,
          title: 'Đăng nhập thành công',
          body: `Bạn vừa đăng nhập vào tài khoản CAB Booking.`,
          data: { userId: userId },
          priority: NotificationPriority.LOW,
        };
        break;
      }

      case 'booking.created': {
        const userId = this.getUserId(data, 'booking.created');
        if (!userId) return;
        notification = {
          userId: userId,
          type: NotificationType.BOOKING_PENDING,
          title: 'Đang tìm tài xế',
          body: `Đơn hàng #${data.bookingId?.slice(-6)} đang được tìm tài xế.`,
          data: { bookingId: data.bookingId },
          priority: NotificationPriority.NORMAL,
        };
        break;
      }

      case 'booking.accepted':
        // Gửi cho customer
        if (data.customerId) {
          await this.createNotification({
            userId: data.customerId,
            type: NotificationType.RIDE_ACCEPTED,
            title: 'Tài xế đã nhận chuyến',
            body: `Tài xế đang trên đường đến đón bạn. Dự kiến ${data.eta || 5} phút.`,
            data: { bookingId: data.bookingId, driverId: data.driverId, eta: data.eta },
            priority: NotificationPriority.HIGH,
          });
        }
        
        // Gửi cho driver
        if (data.driverId) {
          notification = {
            userId: data.driverId,
            type: NotificationType.NEW_RIDE_REQUEST,
            title: 'Đã nhận chuyến thành công',
            body: `Bạn đã nhận chuyến đi. Điểm đón: ${data.pickupLocation?.address || 'Đã chọn'}`,
            data: { bookingId: data.bookingId, customerId: data.customerId },
            priority: NotificationPriority.HIGH,
          };
        }
        break;

      case 'booking.cancelled': {
        const userId = this.getUserId(data, 'booking.cancelled');
        if (!userId) return;
        notification = {
          userId: userId,
          type: NotificationType.BOOKING_CANCELLED,
          title: 'Đặt xe đã bị hủy',
          body: `Đơn hàng #${data.bookingId?.slice(-6)} đã bị hủy. ${data.reason || ''}`,
          data: { bookingId: data.bookingId, reason: data.reason },
          priority: NotificationPriority.HIGH,
        };
        break;
      }

      case 'ride.started': {
        const userId = this.getUserId(data, 'ride.started');
        if (!userId) return;
        notification = {
          userId: userId,
          type: NotificationType.RIDE_STARTED,
          title: 'Chuyến đi đã bắt đầu',
          body: `Chuyến đi của bạn đã bắt đầu. Chúc bạn có hành trình vui vẻ!`,
          data: { rideId: data.rideId, bookingId: data.bookingId },
          priority: NotificationPriority.NORMAL,
        };
        break;
      }

      case 'ride.completed': {
        const userId = this.getUserId(data, 'ride.completed');
        if (!userId) return;
        notification = {
          userId: userId,
          type: NotificationType.RIDE_COMPLETED,
          title: 'Chuyến đi đã hoàn thành',
          body: `Cảm ơn bạn đã sử dụng dịch vụ. Vui lòng đánh giá chuyến đi.`,
          data: { rideId: data.rideId, bookingId: data.bookingId },
          priority: NotificationPriority.NORMAL,
        };
        break;
      }

      case 'ride.cancelled': {
        const userId = this.getUserId(data, 'ride.cancelled');
        if (!userId) return;
        notification = {
          userId: userId,
          type: NotificationType.RIDE_CANCELLED,
          title: 'Chuyến đi đã bị hủy',
          body: `Chuyến đi của bạn đã bị hủy. ${data.reason || 'Vui lòng đặt lại chuyến khác.'}`,
          data: { rideId: data.rideId, bookingId: data.bookingId, reason: data.reason },
          priority: NotificationPriority.HIGH,
        };
        break;
      }

      case 'payment.completed': {
        const userId = this.getUserId(data, 'payment.completed');
        if (!userId) return;
        notification = {
          userId: userId,
          type: NotificationType.PAYMENT_SUCCESS,
          title: 'Thanh toán thành công',
          body: `Bạn đã thanh toán ${data.amount?.toLocaleString()}đ cho chuyến đi.`,
          data: { paymentId: data.paymentId, amount: data.amount },
          priority: NotificationPriority.HIGH,
        };
        break;
      }

      case 'payment.failed': {
        const userId = this.getUserId(data, 'payment.failed');
        if (!userId) return;
        notification = {
          userId: userId,
          type: NotificationType.PAYMENT_FAILED,
          title: 'Thanh toán thất bại',
          body: `Thanh toán ${data.amount?.toLocaleString()}đ thất bại. Vui lòng thử lại.`,
          data: { paymentId: data.paymentId, error: data.error },
          priority: NotificationPriority.CRITICAL,
        };
        break;
      }

      case 'driver.approved': {
        const userId = this.getUserId(data, 'driver.approved');
        if (!userId) return;
        notification = {
          userId: userId,
          type: NotificationType.DRIVER_APPROVED,
          title: 'Tài khoản tài xế đã được duyệt',
          body: `Chúc mừng! Tài khoản tài xế của bạn đã được duyệt. Bạn có thể bắt đầu nhận chuyến.`,
          data: { driverId: userId },
          priority: NotificationPriority.HIGH,
        };
        break;
      }
    }

    if (notification) {
      await this.createNotification(notification);
    }
  }

  async createNotification(createDto: CreateNotificationDto): Promise<NotificationResponseDto> {
    this.logger.log(`Creating notification for user ${createDto.userId}: ${createDto.title}`);

    const notification = new this.notificationModel({
      userId: createDto.userId,
      type: createDto.type,
      title: createDto.title,
      body: createDto.body,
      data: createDto.data || {},
      channel: createDto.channel || NotificationChannel.ALL,
      priority: createDto.priority || NotificationPriority.NORMAL,
      metadata: createDto.metadata || {},
    });

    await notification.save();

    // Gửi real-time qua WebSocket
    this.notificationGateway.sendToUser(createDto.userId, 'new_notification', {
      id: notification._id,
      title: notification.title,
      body: notification.body,
      type: notification.type,
      data: notification.data,
      createdAt: notification.createdAt,
    });

    // Gửi qua các kênh khác
    await this.sendViaChannels(notification);

    return this.mapToResponse(notification);
  }

  async sendBulkNotifications(dto: SendBulkNotificationDto): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const userId of dto.userIds) {
      try {
        await this.createNotification({
          userId,
          type: dto.type as NotificationType,
          title: dto.title,
          body: dto.body,
          data: dto.data,
          channel: dto.channel,
        });
        success++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to send to ${userId}: ${errorMessage}`);
        failed++;
      }
    }

    return { success, failed };
  }

  private async sendViaChannels(notification: NotificationDocument) {
    const { channel, metadata } = notification;

    try {
      if (channel === NotificationChannel.PUSH || channel === NotificationChannel.ALL) {
        if (metadata?.deviceToken) {
          await this.pushService.sendPush(metadata.deviceToken, {
            title: notification.title,
            body: notification.body,
            data: notification.data,
          });
        }
      }

      if (channel === NotificationChannel.SMS || channel === NotificationChannel.ALL) {
        if (metadata?.phoneNumber) {
          await this.smsService.sendSms(metadata.phoneNumber, notification.body);
        }
      }

      if (channel === NotificationChannel.EMAIL || channel === NotificationChannel.ALL) {
        if (metadata?.email) {
          await this.emailService.sendEmail(metadata.email, notification.title, notification.body);
        }
      }

      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();
      await notification.save();

      this.logger.log(`✅ Notification sent via ${channel}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send via ${channel}: ${errorMessage}`);
      notification.status = NotificationStatus.FAILED;
      notification.metadata = { ...notification.metadata, error: errorMessage };
      await notification.save();
    }
  }

  async getUserNotifications(userId: string, page: number = 1, limit: number = 20): Promise<any> {
    const skip = (page - 1) * limit;
    
    const [notifications, total] = await Promise.all([
      this.notificationModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments({ userId }),
    ]);

    return {
      data: notifications.map(n => this.mapToResponse(n)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      unreadCount: await this.getUnreadCount(userId),
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      userId,
      isRead: false,
    });
  }

  async markAsRead(userId: string, notificationIds: string[]): Promise<void> {
    await this.notificationModel.updateMany(
      { _id: { $in: notificationIds }, userId },
      { isRead: true, readAt: new Date() },
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    await this.notificationModel.deleteOne({ _id: notificationId, userId });
  }

  private mapToResponse(notification: NotificationDocument): NotificationResponseDto {
    const obj = notification.toObject();
    return {
      id: (obj._id as any).toString(),
      userId: obj.userId,
      type: obj.type,
      title: obj.title,
      body: obj.body,
      data: obj.data,
      channel: obj.channel,
      priority: obj.priority,
      status: obj.status,
      isRead: obj.isRead,
      sentAt: obj.sentAt,
      readAt: obj.readAt,
      createdAt: obj.createdAt,
    };
  }
}