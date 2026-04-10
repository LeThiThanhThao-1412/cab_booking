import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '@cab-booking/shared';
import { ConfigService } from '@nestjs/config';
import { SurgeConfig } from '../entities/surge-config.entity';
import { SurgeLevel } from '../enums/pricing.enum';

@Injectable()
export class SurgePricingService {
  private readonly logger = new Logger(SurgePricingService.name);
  private readonly ZONE_RADIUS = 2000;

  constructor(
    @InjectRepository(SurgeConfig)
    private surgeConfigRepository: Repository<SurgeConfig>,
    private redisService: RedisService,
    private configService: ConfigService,
  ) {}

  async getSurgeMultiplier(latitude: number, longitude: number): Promise<{ multiplier: number; level: string; reason: string }> {
    try {
      const zoneKey = this.getZoneKey(latitude, longitude);
      const driversOnline = await this.getDriversInZone(latitude, longitude);
      const pendingBookings = await this.getPendingBookingsInZone(latitude, longitude);
      const supplyDemandRatio = driversOnline / (pendingBookings + 1);
      
      this.logger.debug(`Zone ${zoneKey}: drivers=${driversOnline}, bookings=${pendingBookings}, ratio=${supplyDemandRatio.toFixed(2)}`);
      
      let surgeLevel: SurgeLevel;
      let reason = '';
      
      if (supplyDemandRatio >= 3) {
        surgeLevel = SurgeLevel.NORMAL;
        reason = 'Nhiều tài xế';
      } else if (supplyDemandRatio >= 1.5) {
        surgeLevel = SurgeLevel.LOW;
        reason = 'Ít tài xế';
      } else if (supplyDemandRatio >= 0.8) {
        surgeLevel = SurgeLevel.MEDIUM;
        reason = 'Thiếu tài xế';
      } else if (supplyDemandRatio >= 0.3) {
        surgeLevel = SurgeLevel.HIGH;
        reason = 'Khan hiếm tài xế';
      } else {
        surgeLevel = SurgeLevel.PEAK;
        reason = 'Rất khan hiếm tài xế';
      }
      
      const currentHour = new Date().getHours();
      const isPeakHour = (currentHour >= 7 && currentHour <= 9) || (currentHour >= 17 && currentHour <= 19);
      
      if (isPeakHour && surgeLevel !== SurgeLevel.PEAK) {
        surgeLevel = SurgeLevel.PEAK;
        reason = 'Giờ cao điểm + ' + reason;
      }
      
      const config = await this.surgeConfigRepository.findOne({
        where: { level: surgeLevel },
      });
      
      const multiplier = Number(config?.multiplier || 1);
      
      return {
        multiplier,
        level: surgeLevel,
        reason,
      };
      
    } catch (error) {
      this.logger.error(`Error calculating surge: ${error.message}`);
      return { multiplier: 1, level: SurgeLevel.NORMAL, reason: 'Normal' };
    }
  }

  private getZoneKey(lat: number, lng: number): string {
    const zoneLat = Math.floor(lat / 0.018) * 0.018;
    const zoneLng = Math.floor(lng / 0.018) * 0.018;
    return `${zoneLat.toFixed(3)}_${zoneLng.toFixed(3)}`;
  }

  private async getDriversInZone(lat: number, lng: number): Promise<number> {
    try {
      const redisClient = this.redisService.getClient();
      const nearbyDrivers = await redisClient.georadius(
        'driver:locations',
        lng,
        lat,
        this.ZONE_RADIUS,
        'm',
      );
      return nearbyDrivers.length;
    } catch (error) {
      this.logger.error(`Error getting drivers in zone: ${error.message}`);
      return 10;
    }
  }

  private async getPendingBookingsInZone(lat: number, lng: number): Promise<number> {
    return Math.floor(Math.random() * 10);
  }
}