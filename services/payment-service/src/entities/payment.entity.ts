import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  UpdateDateColumn,
  Index 
} from 'typeorm';
import { PaymentStatus, TransactionType } from '../enums/payment.enum';

// Định nghĩa interface cho metadata
export interface PaymentMetadata {
  surgeMultiplier?: number;
  basePrice?: number;
  distancePrice?: number;
  timePrice?: number;
  paymentGateway?: string;
  gatewayTransactionId?: string;
  gatewayResponse?: any;
  refundReason?: string;
  refundTransactionId?: string;
  couponDiscount?: number;
  promotionId?: string;
  error?: string;
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  transactionId: string;

  @Column()
  @Index()
  rideId: string;

  @Column()
  @Index()
  bookingId: string;

  @Column()
  @Index()
  customerId: string;

  @Column()
  @Index()
  driverId: string;

  @Column('decimal', { precision: 10, scale: 0 })
  amount: number;

  @Column('decimal', { precision: 10, scale: 0, default: 0 })
  discountAmount: number;

  @Column('decimal', { precision: 10, scale: 0, default: 0 })
  finalAmount: number;

  @Column({ type: 'varchar' })  // ← SỬA TỪ 'enum' THÀNH 'varchar'
  method: string;               // ← SỬA TỪ PaymentMethod THÀNH string

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'enum', enum: TransactionType, default: TransactionType.PAYMENT })
  type: TransactionType;

  @Column({ nullable: true })
  couponCode: string;

  @Column('json', { nullable: true })
  metadata: PaymentMetadata;

  @Column({ nullable: true })
  paidAt: Date;

  @Column({ nullable: true })
  refundedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}