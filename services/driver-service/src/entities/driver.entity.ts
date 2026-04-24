import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  UpdateDateColumn,
  Index 
} from 'typeorm';

export enum DriverStatus {
  PENDING_APPROVAL = 'pending_approval',
  ONLINE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  BUSY = 'busy',
  OFFLINE = 'offline',
}

export enum VehicleType {
  CAR_4 = 'car_4',
  CAR_7 = 'car_7',
  MOTORBIKE = 'motorbike',
}

@Entity('drivers')
export class Driver {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  userId: string; // ID từ auth-service

  @Column({ nullable: true })
  fullName: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({
    type: 'enum',
    enum: DriverStatus,
    default: DriverStatus.PENDING_APPROVAL,
  })
  status: DriverStatus;

  // Thông tin xe
  @Column({
    type: 'enum',
    enum: VehicleType,
    nullable: true,
  })
  vehicleType: VehicleType;

  @Column({ nullable: true })
  vehicleModel: string;

  @Column({ nullable: true })
  vehicleColor: string;

  @Column({ nullable: true })
  vehiclePlate: string;

  @Column({ nullable: true })
  vehicleYear: number;

  // Giấy tờ
  @Column({ nullable: true })
  licenseNumber: string;

  @Column({ nullable: true })
  licenseExpiry: Date;

  @Column({ nullable: true })
  idCardNumber: string;

  @Column({ type: 'json', nullable: true })
  documents: Array<{
    type: string;
    url: string;
    verified: boolean;
  }>;

  // Thông tin hoạt động
  @Column({ default: 0 })
  totalTrips: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ type: 'json', nullable: true })
  currentLocation: {
    lat: number;
    lng: number;
    updatedAt: Date;
  };

  @Column({ nullable: true })
  lastActiveAt: Date;

  @Column({ type: 'json', nullable: true })
  earnings: {
    today: number;
    week: number;
    month: number;
    total: number;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}