import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { CouponType, CouponStatus, VehicleType } from '../enums/pricing.enum';

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  code: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'enum', enum: CouponType })
  type: CouponType;

  @Column('decimal', { precision: 10, scale: 0 })
  value: number; // Số % hoặc số tiền

  @Column('decimal', { precision: 10, scale: 0, nullable: true })
  maxDiscount: number; // Giảm tối đa (cho %)

  @Column('decimal', { precision: 10, scale: 0, default: 0 })
  minOrderValue: number; // Đơn tối thiểu

  @Column({ type: 'json', nullable: true })
  applicableVehicles: VehicleType[]; // Loại xe áp dụng, null = tất cả

  @Column({ type: 'json', nullable: true })
  applicableZones: string[]; // Khu vực áp dụng, null = tất cả

  @Column({ default: 0 })
  usageLimit: number; // Giới hạn số lượt dùng, 0 = không giới hạn

  @Column({ default: 0 })
  usedCount: number; // Số lượt đã dùng

  @Column({ default: 1 })
  perUserLimit: number; // Giới hạn mỗi user

  @Column({ type: 'json', nullable: true })
  applicableUserIds: string[]; // User được áp dụng, null = tất cả

  @Column({ nullable: true })
  validFrom: Date;

  @Column({ nullable: true })
  validTo: Date;

  @Column({ type: 'enum', enum: CouponStatus, default: CouponStatus.ACTIVE })
  status: CouponStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}