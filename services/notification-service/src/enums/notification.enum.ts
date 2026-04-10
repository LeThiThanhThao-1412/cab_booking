export enum NotificationType {
  // Ride notifications
  RIDE_CREATED = 'ride.created',
  RIDE_ACCEPTED = 'ride.accepted',
  RIDE_STARTED = 'ride.started',
  RIDE_COMPLETED = 'ride.completed',
  RIDE_CANCELLED = 'ride.cancelled',
  RIDE_ARRIVING = 'ride.arriving',
  DRIVER_ARRIVED = 'driver.arrived',
  
  // Booking notifications
  BOOKING_CONFIRMED = 'booking.confirmed',
  BOOKING_PENDING = 'booking.pending',
  BOOKING_CANCELLED = 'booking.cancelled',      // ← THÊM DÒNG NÀY
  BOOKING_NO_DRIVER = 'booking.no.driver',
  
  // Driver notifications
  NEW_RIDE_REQUEST = 'new.ride.request',
  RIDE_REQUEST_EXPIRED = 'ride.request.expired',
  DRIVER_APPROVED = 'driver.approved',
  DRIVER_REJECTED = 'driver.rejected',
  
  // Payment notifications
  PAYMENT_SUCCESS = 'payment.success',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_REFUNDED = 'payment.refunded',
  
  // Promotion notifications
  COUPON_RECEIVED = 'coupon.received',
  PROMOTION_NEW = 'promotion.new',
  
  // System notifications
  ACCOUNT_VERIFIED = 'account.verified',
  PASSWORD_RESET = 'password.reset',
  WALLET_UPDATED = 'wallet.updated',
}

export enum NotificationChannel {
  PUSH = 'push',       // In-app notification
  SMS = 'sms',         // SMS message
  EMAIL = 'email',     // Email
  ALL = 'all',         // All channels
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}