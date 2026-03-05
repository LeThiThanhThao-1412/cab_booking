import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '@cab-booking/shared';
import { Driver, DriverStatus } from '../entities/driver.entity';
import { UpdateDriverDto, DriverLocationDto, DriverResponseDto } from '../dto/driver.dto';
import { NearbyDriverDto } from '../dto/driver.dto';

@Injectable()
export class DriverService {
  private readonly logger = new Logger(DriverService.name);

  constructor(
    @InjectRepository(Driver)
    private driverRepository: Repository<Driver>,
    private redisService: RedisService,
  ) {}

  async getDriverByUserId(userId: string): Promise<DriverResponseDto> {
    const driver = await this.driverRepository.findOne({
      where: { userId },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    // Lấy vị trí hiện tại từ Redis
    const location = await this.redisService.getDriverLocation(driver.userId);
    
    return {
      ...driver,
      currentLocation: location ? {
        lat: location.lat,
        lng: location.lng,
        updatedAt: new Date(),
      } : null,
    } as DriverResponseDto;
  }

  async updateDriver(userId: string, updateDto: UpdateDriverDto): Promise<DriverResponseDto> {
    const driver = await this.driverRepository.findOne({
      where: { userId },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    Object.assign(driver, updateDto);
    await this.driverRepository.save(driver);

    return driver as DriverResponseDto;
  }

  async updateLocation(userId: string, locationDto: DriverLocationDto): Promise<void> {
    // Lưu vào Redis GEO
    await this.redisService.setDriverLocation(
      userId,
      locationDto.latitude,
      locationDto.longitude,
    );

    // Cập nhật lastActive
    await this.driverRepository.update(
      { userId },
      { lastActiveAt: new Date() },
    );

    this.logger.debug(`📍 Driver ${userId} location updated`);
  }

  async updateStatus(userId: string, status: string): Promise<DriverResponseDto> {
    const driver = await this.driverRepository.findOne({
      where: { userId },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    // Map status từ request sang DriverStatus
    let newStatus: DriverStatus;
    switch (status) {
      case 'online':
        newStatus = DriverStatus.ACTIVE;
        break;
      case 'offline':
        newStatus = DriverStatus.OFFLINE;
        // Xóa location khỏi Redis khi offline
        await this.redisService.removeDriverLocation(userId);
        break;
      case 'busy':
        newStatus = DriverStatus.BUSY;
        break;
      default:
        newStatus = driver.status;
    }

    driver.status = newStatus;
    await this.driverRepository.save(driver);

    return driver as DriverResponseDto;
  }

  async findNearbyDrivers(
    latitude: number,
    longitude: number,
    radius: number = 5000,
  ): Promise<NearbyDriverDto[]> {
    // Tìm tài xế gần nhất trong Redis
    const nearbyDrivers = await this.redisService.getNearbyDrivers(
      latitude,
      longitude,
      radius,
    );

    // Lọc chỉ lấy tài xế đang active
    const activeDrivers: NearbyDriverDto[] = [];
    for (const { driverId, distance } of nearbyDrivers) {
      const driver = await this.driverRepository.findOne({
        where: { 
          userId: driverId,
          status: DriverStatus.ACTIVE,
        },
      });

      if (driver) {
        activeDrivers.push({
          driverId: driver.userId,
          fullName: driver.fullName,
          vehicleType: driver.vehicleType,
          vehicleModel: driver.vehicleModel,
          vehicleColor: driver.vehicleColor,
          vehiclePlate: driver.vehiclePlate,
          rating: driver.rating,
          distance: Math.round(distance / 1000 * 10) / 10, // Convert to km
        });
      }
    }

    return activeDrivers;
  }
}