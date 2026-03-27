import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('coupon_usages')
export class CouponUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  couponId: string;

  @Column()
  @Index()
  userId: string;

  @Column()
  @Index()
  bookingId: string;

  @Column('decimal', { precision: 10, scale: 0 })
  originalAmount: number;

  @Column('decimal', { precision: 10, scale: 0 })
  discountAmount: number;

  @Column('decimal', { precision: 10, scale: 0 })
  finalAmount: number;

  @CreateDateColumn()
  usedAt: Date;
}