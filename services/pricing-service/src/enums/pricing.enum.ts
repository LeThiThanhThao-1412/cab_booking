export enum VehicleType {
  MOTORBIKE = 'motorbike',
  CAR_4 = 'car_4',
  CAR_7 = 'car_7',
}

export enum CouponType {
  PERCENTAGE = 'percentage',   // Giảm theo %
  FIXED = 'fixed',             // Giảm cố định
}

export enum CouponStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  DISABLED = 'disabled',
}

export enum SurgeLevel {
  NORMAL = 'normal',           // x1.0
  LOW = 'low',                 // x1.2
  MEDIUM = 'medium',           // x1.5
  HIGH = 'high',               // x2.0
  PEAK = 'peak',               // x3.0
}