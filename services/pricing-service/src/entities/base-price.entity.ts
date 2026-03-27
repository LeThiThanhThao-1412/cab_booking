import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { VehicleType } from '../enums/pricing.enum';

@Entity('base_prices')
export class BasePrice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: VehicleType })
  vehicleType: VehicleType;

  @Column('decimal', { precision: 10, scale: 0 })
  baseFare: number; // Giá mở cửa

  @Column('decimal', { precision: 10, scale: 0 })
  perKm: number; // Giá theo km

  @Column('decimal', { precision: 10, scale: 0 })
  perMinute: number; // Giá theo phút

  @Column('decimal', { precision: 10, scale: 0, default: 0 })
  minimumFare: number; // Giá tối thiểu

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}