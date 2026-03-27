import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { SurgeLevel } from '../enums/pricing.enum';

@Entity('surge_configs')
export class SurgeConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: SurgeLevel })
  level: SurgeLevel;

  @Column('decimal', { precision: 3, scale: 1 })
  multiplier: number; // Hệ số nhân

  @Column('decimal', { precision: 10, scale: 0 })
  minDriversOnline: number; // Số tài xế tối thiểu để áp dụng

  @Column('decimal', { precision: 10, scale: 0 })
  maxPendingBookings: number; // Số booking chờ tối đa

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}