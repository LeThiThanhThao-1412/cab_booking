export enum ReviewType {
  CUSTOMER_TO_DRIVER = 'customer_to_driver',  // Khách đánh giá tài xế
  DRIVER_TO_CUSTOMER = 'driver_to_customer',  // Tài xế đánh giá khách
}

export enum ReviewStatus {
  PENDING = 'pending',      // Chờ xử lý
  PUBLISHED = 'published',  // Đã đăng
  HIDDEN = 'hidden',        // Ẩn (vi phạm)
  FLAGGED = 'flagged',      // Bị báo cáo
}

export enum FlagReason {
  INAPPROPRIATE = 'inappropriate',  // Nội dung không phù hợp
  SPAM = 'spam',                    // Spam
  HARASSMENT = 'harassment',        // Quấy rối
  FALSE_INFO = 'false_info',        // Thông tin sai lệch
  OTHER = 'other',                  // Khác
}

export enum RatingDimension {
  DRIVING_SKILL = 'driving_skill',     // Kỹ năng lái xe
  PUNCTUALITY = 'punctuality',         // Đúng giờ
  VEHICLE_CLEANLINESS = 'vehicle_cleanliness', // Vệ sinh xe
  ATTITUDE = 'attitude',               // Thái độ
  COMFORT = 'comfort',                 // Sự thoải mái
}

export const RATING_DIMENSIONS = [
  RatingDimension.DRIVING_SKILL,
  RatingDimension.PUNCTUALITY,
  RatingDimension.VEHICLE_CLEANLINESS,
  RatingDimension.ATTITUDE,
  RatingDimension.COMFORT,
];