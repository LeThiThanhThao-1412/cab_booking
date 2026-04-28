import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RabbitMQService } from '@cab-booking/shared';
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
      { queue: 'notification.auth.registered', exchange: 'auth.events', routingKey: 'auth.user.registered' },
      { queue: 'notification.auth.login', exchange: 'auth.events', routingKey: 'auth.user.login' },
      { queue: 'notification.booking.cancelled', exchange: 'booking.events', routingKey: 'booking.cancelled' },
      { queue: 'notification.booking.nodriver', exchange: 'booking.events', routingKey: 'booking.no_driver' },
      { queue: 'notification.ride.started', exchange: 'ride.events', routingKey: 'ride.started' },
      { queue: 'notification.ride.arrived', exchange: 'ride.events', routingKey: 'ride.arrived_at_pickup' },       // ← THÊM
      { queue: 'notification.ride.inprogress', exchange: 'ride.events', routingKey: 'ride.in_progress' },           // ← THÊM
      { queue: 'notification.ride.completed', exchange: 'ride.events', routingKey: 'ride.completed' },
      { queue: 'notification.ride.cancelled', exchange: 'ride.events', routingKey: 'ride.cancelled' },
      { queue: 'notification.payment.completed', exchange: 'payment.events', routingKey: 'payment.completed' },
      { queue: 'notification.payment.failed', exchange: 'payment.events', routingKey: 'payment.failed' },
      { queue: 'notification.driver.approved', exchange: 'driver.events', routingKey: 'driver.approved' },
      { queue: 'notification.matching.request', exchange: 'matching.events', routingKey: 'matching.request' },
      { queue: 'notification.matching.accepted', exchange: 'matching.events', routingKey: 'matching.driver.accepted' },
      { queue: 'notification.matching.rejected', exchange: 'matching.events', routingKey: 'matching.driver.rejected' },
      { queue: 'notification.matching.nodriver', exchange: 'matching.events', routingKey: 'matching.no.driver' },
    ];

    for (const { queue, exchange, routingKey } of events) {
      try {
        await this.rabbitMQService.subscribe(queue, async (msg: any) => {
          await this.handleEvent(msg, routingKey);
        }, { exchange, routingKey });
        this.logger.log(`✅ ${queue}`);
      } catch (error) {
        this.logger.error(`❌ ${queue}: ${error.message}`);
      }
    }
    this.logger.log('✅ All events subscribed');
  }

  async handleEvent(event: any, routingKey: string) {
    this.logger.log(`📨 ${routingKey}`);
    const data = event.data || event;
    const notifications: CreateNotificationDto[] = [];

    switch (routingKey) {
      // ============ AUTH ============
      case 'auth.user.registered': {
        const userId = data.userId || data.sub;
        if (!userId) return;
        notifications.push({
          userId, type: NotificationType.ACCOUNT_VERIFIED,
          title: '🎉 Chào mừng đến với CAB Booking!',
          body: `Chào ${data.fullName || data.name || 'bạn'}, đăng ký thành công!`,
          data: { userId }, priority: NotificationPriority.HIGH,
        });
        break;
      }

      case 'auth.user.login': {
        const userId = data.userId || data.sub;
        if (!userId) return;
        notifications.push({
          userId, type: NotificationType.ACCOUNT_VERIFIED,
          title: '🔑 Đăng nhập thành công',
          body: `Chào ${data.fullName || data.name || 'bạn'}, bạn vừa đăng nhập.`,
          data: { userId }, priority: NotificationPriority.LOW,
        });
        break;
      }

      // ============ BOOKING ============
      case 'booking.cancelled': {
        const recipients = [data.customerId, data.driverId].filter(Boolean);
        for (const userId of recipients) {
          notifications.push({
            userId, type: NotificationType.BOOKING_CANCELLED,
            title: '❌ Đặt xe đã bị hủy',
            body: `Đơn hàng #${(data.bookingId || '').slice(-6)} đã bị hủy.`,
            data: { bookingId: data.bookingId }, priority: NotificationPriority.HIGH,
          });
        }
        break;
      }

      case 'booking.no_driver': {
        if (data.customerId) {
          notifications.push({
            userId: data.customerId, type: NotificationType.BOOKING_NO_DRIVER,
            title: '😞 Không tìm thấy tài xế',
            body: 'Không có tài xế nào khả dụng.',
            data: { bookingId: data.bookingId }, priority: NotificationPriority.HIGH,
          });
        }
        break;
      }

      // ============ RIDE ============
      case 'ride.arrived_at_pickup': {  // ← THÊM CASE NÀY
        if (data.customerId) {
          notifications.push({
            userId: data.customerId, type: NotificationType.DRIVER_ARRIVED,
            title: '📍 Tài xế đã đến!',
            body: 'Tài xế đã đến điểm đón. Vui lòng ra đón xe.',
            data: { rideId: data.rideId, bookingId: data.bookingId },
            priority: NotificationPriority.HIGH,
          });
        }
        break;
      }

      case 'ride.in_progress': {  // ← THÊM CASE NÀY
        if (data.customerId) {
          notifications.push({
            userId: data.customerId, type: NotificationType.RIDE_STARTED,
            title: '🟢 Chuyến đi đã bắt đầu',
            body: 'Chúc bạn có hành trình vui vẻ!',
            data: { rideId: data.rideId, bookingId: data.bookingId },
            priority: NotificationPriority.NORMAL,
          });
        }
        break;
      }

      case 'ride.completed': {
        if (data.customerId) {
          notifications.push({
            userId: data.customerId, type: NotificationType.RIDE_COMPLETED,
            title: '✅ Chuyến đi hoàn thành',
            body: `Tổng tiền: ${(data.price?.total || 0).toLocaleString()}đ.`,
            data: { rideId: data.rideId, bookingId: data.bookingId, price: data.price },
            priority: NotificationPriority.NORMAL,
          });
        }
        if (data.driverId) {
          notifications.push({
            userId: data.driverId, type: NotificationType.RIDE_COMPLETED,
            title: '💰 Chuyến đi hoàn thành',
            body: `Thu nhập: ${(data.price?.total || 0).toLocaleString()}đ.`,
            data: { rideId: data.rideId, bookingId: data.bookingId, price: data.price },
            priority: NotificationPriority.HIGH,
          });
        }
        break;
      }

      case 'ride.cancelled': {
        const recipients = [data.customerId, data.driverId].filter(Boolean);
        for (const userId of recipients) {
          notifications.push({
            userId, type: NotificationType.RIDE_CANCELLED,
            title: '❌ Chuyến đi bị hủy',
            body: data.reason || 'Vui lòng đặt lại.',
            data: { rideId: data.rideId, bookingId: data.bookingId },
            priority: NotificationPriority.HIGH,
          });
        }
        break;
      }

      // ============ PAYMENT ============
      case 'payment.completed': {
        if (data.customerId) {
          notifications.push({
            userId: data.customerId, type: NotificationType.PAYMENT_SUCCESS,
            title: '💳 Thanh toán thành công',
            body: `Đã thanh toán ${(data.amount || 0).toLocaleString()}đ.`,
            data: { paymentId: data.paymentId }, priority: NotificationPriority.HIGH,
          });
        }
        if (data.driverId) {
          notifications.push({
            userId: data.driverId, type: NotificationType.PAYMENT_SUCCESS,
            title: '💰 Đã nhận thanh toán',
            body: `Đã nhận ${(data.amount || 0).toLocaleString()}đ.`,
            data: { paymentId: data.paymentId }, priority: NotificationPriority.HIGH,
          });
        }
        break;
      }

      case 'payment.failed': {
        if (data.customerId) {
          notifications.push({
            userId: data.customerId, type: NotificationType.PAYMENT_FAILED,
            title: '⚠️ Thanh toán thất bại',
            body: data.error || 'Vui lòng thử lại.',
            data: { paymentId: data.paymentId }, priority: NotificationPriority.CRITICAL,
          });
        }
        break;
      }

      // ============ DRIVER ============
      case 'driver.approved': {
        const userId = data.driverId || data.userId || data.id;
        if (!userId) return;
        notifications.push({
          userId, type: NotificationType.DRIVER_APPROVED,
          title: '🎉 Tài khoản được duyệt!',
          body: 'Bạn có thể bắt đầu nhận chuyến.',
          data: { driverId: userId }, priority: NotificationPriority.HIGH,
        });
        break;
      }

      // ============ MATCHING ============
      case 'matching.request': {
        if (data.driverId) {
          const priceTotal = data.price?.finalPrice || data.price?.total || 0;
          notifications.push({
            userId: data.driverId, type: NotificationType.NEW_RIDE_REQUEST,
            title: '🔔 Có khách gần bạn!',
            body: `Từ ${data.pickupLocation?.address || '...'}. Giá: ${priceTotal.toLocaleString()}đ.`,
            data: { bookingId: data.bookingId, pickupLocation: data.pickupLocation, dropoffLocation: data.dropoffLocation, price: data.price, expiresIn: data.expiresIn },
            priority: NotificationPriority.CRITICAL, channel: NotificationChannel.ALL,
          });
        }
        break;
      }

      case 'matching.driver.accepted': {
        if (data.customerId) {
          notifications.push({
            userId: data.customerId, type: NotificationType.RIDE_ACCEPTED,
            title: '✅ Tài xế đã nhận chuyến!',
            body: `Tài xế ${data.driverName || data.driverId?.slice(-6) || ''} đang đến đón bạn.`,
            data: { bookingId: data.bookingId, driverId: data.driverId, eta: data.eta, price: data.price },
            priority: NotificationPriority.HIGH,
          });
        }
        if (data.driverId) {
          notifications.push({
            userId: data.driverId, type: NotificationType.NEW_RIDE_REQUEST,
            title: '✅ Bạn đã nhận chuyến',
            body: `Đón tại ${data.pickupLocation?.address || '...'}.`,
            data: { bookingId: data.bookingId, customerId: data.customerId },
            priority: NotificationPriority.HIGH,
          });
        }
        break;
      }

      case 'matching.driver.rejected': {
        if (data.customerId) {
          notifications.push({
            userId: data.customerId, type: NotificationType.BOOKING_NO_DRIVER,
            title: '🔄 Tài xế từ chối',
            body: 'Đang tìm tài xế khác...',
            data: { bookingId: data.bookingId }, priority: NotificationPriority.NORMAL,
          });
        }
        break;
      }

      case 'matching.no.driver': {
        if (data.customerId) {
          notifications.push({
            userId: data.customerId, type: NotificationType.BOOKING_NO_DRIVER,
            title: '😞 Không tìm thấy tài xế',
            body: 'Vui lòng thử lại sau.',
            data: { bookingId: data.bookingId }, priority: NotificationPriority.HIGH,
          });
        }
        break;
      }

      default:
        return;
    }

    for (const notif of notifications) {
      try { await this.createNotification(notif); } catch (error) {}
    }
    this.logger.log(`✅ ${notifications.length} notifications for: ${routingKey}`);
  }

  async createNotification(createDto: CreateNotificationDto): Promise<NotificationResponseDto> {
    const notification = new this.notificationModel({
      userId: createDto.userId, type: createDto.type, title: createDto.title, body: createDto.body,
      data: createDto.data || {}, channel: createDto.channel || NotificationChannel.ALL,
      priority: createDto.priority || NotificationPriority.NORMAL, metadata: createDto.metadata || {},
    });
    await notification.save();
    try {
      this.notificationGateway.sendToUser(createDto.userId, 'new_notification', {
        id: notification._id.toString(), title: notification.title, body: notification.body,
        type: notification.type, data: notification.data, priority: notification.priority,
        isRead: false, createdAt: notification.createdAt,
      });
    } catch (error) {}
    await this.sendViaChannels(notification);
    return this.mapToResponse(notification);
  }

  private async sendViaChannels(notification: NotificationDocument) {
    try {
      const { channel, metadata } = notification;
      if ((channel === NotificationChannel.PUSH || channel === NotificationChannel.ALL) && metadata?.deviceToken) {
        await this.pushService.sendPush(metadata.deviceToken, { title: notification.title, body: notification.body, data: notification.data });
      }
      if ((channel === NotificationChannel.SMS || channel === NotificationChannel.ALL) && metadata?.phoneNumber) {
        await this.smsService.sendSms(metadata.phoneNumber, notification.body);
      }
      if ((channel === NotificationChannel.EMAIL || channel === NotificationChannel.ALL) && metadata?.email) {
        await this.emailService.sendEmail(metadata.email, notification.title, notification.body);
      }
      notification.status = NotificationStatus.SENT; notification.sentAt = new Date(); await notification.save();
    } catch (error) {
      notification.status = NotificationStatus.FAILED; await notification.save();
    }
  }

  async sendBulkNotifications(dto: SendBulkNotificationDto): Promise<{ success: number; failed: number }> {
    let s = 0, f = 0;
    for (const userId of dto.userIds) {
      try { await this.createNotification({ userId, type: dto.type as NotificationType, title: dto.title, body: dto.body, data: dto.data, channel: dto.channel, priority: dto.priority }); s++; } catch { f++; }
    }
    return { success: s, failed: f };
  }

  async getUserNotifications(userId: string, page = 1, limit = 20): Promise<any> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.notificationModel.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.notificationModel.countDocuments({ userId }),
    ]);
    return { data: data.map(n => this.mapToResponse(n)), total, page, totalPages: Math.ceil(total / limit), unreadCount: await this.getUnreadCount(userId) };
  }

  async getUnreadCount(userId: string): Promise<number> { return this.notificationModel.countDocuments({ userId, isRead: false }); }
  async markAsRead(userId: string, ids: string[]): Promise<void> { await this.notificationModel.updateMany({ _id: { $in: ids }, userId }, { isRead: true, readAt: new Date() }); }
  async markAllAsRead(userId: string): Promise<void> { await this.notificationModel.updateMany({ userId, isRead: false }, { isRead: true, readAt: new Date() }); }
  async deleteNotification(userId: string, id: string): Promise<void> { await this.notificationModel.deleteOne({ _id: id, userId }); }

  private mapToResponse(n: NotificationDocument): NotificationResponseDto {
    const o = n.toObject();
    return { id: (o._id as any).toString(), userId: o.userId, type: o.type, title: o.title, body: o.body, data: o.data, channel: o.channel, priority: o.priority, status: o.status, isRead: o.isRead, sentAt: o.sentAt, readAt: o.readAt, createdAt: o.createdAt };
  }
}