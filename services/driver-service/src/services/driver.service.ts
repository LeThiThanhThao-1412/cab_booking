import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '@cab-booking/shared';
import { Driver, DriverStatus } from '../entities/driver.entity';
import { UpdateDriverDto, DriverLocationDto, DriverResponseDto } from '../dto/driver.dto';

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
  async createDriver(data: any) {
    const driver = this.driverRepository.create({
      userId: data.userId,
      email: data.email,
      fullName: data.fullName,
      phone: data.phone,
      status: DriverStatus.OFFLINE,
    });

    return this.driverRepository.save(driver);
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
    // 1. Lưu vào Redis GEO (cho tìm kiếm gần nhất)
    await this.redisService.setDriverLocation(
      userId,
      locationDto.latitude,
      locationDto.longitude,
    );

    // 2. Cập nhật currentLocation trong PostgreSQL (cho lưu trữ)
    await this.driverRepository.update(
      { userId },
      { 
        currentLocation: {
          lat: locationDto.latitude,
          lng: locationDto.longitude,
          updatedAt: new Date(),
        },
        lastActiveAt: new Date() 
      },
    );

    this.logger.debug(`📍 Driver ${userId} location updated in Redis and PostgreSQL`);
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
): Promise<any[]> {
  try {
    this.logger.log(`Finding nearby drivers at (${latitude}, ${longitude}) within ${radius}m`);

    // 1. Tìm tài xế gần nhất trong Redis GEO
    const nearbyDrivers = await this.redisService.getNearbyDrivers(
      latitude,
      longitude,
      radius,
    );

    this.logger.log(`Found ${nearbyDrivers.length} drivers in Redis`);

    if (nearbyDrivers.length === 0) {
      this.logger.log('No drivers found in Redis');
      return []; // Trả về mảng rỗng, không throw error
    }

    // 2. Lấy thông tin chi tiết của các tài xế từ PostgreSQL
    const driverIds = nearbyDrivers.map(d => d.driverId);
    
    const drivers = await this.driverRepository
      .createQueryBuilder('driver')
      .where('driver.userId IN (:...driverIds)', { driverIds })
      .andWhere('driver.status = :status', { status: DriverStatus.ACTIVE })
      .getMany();

    this.logger.log(`Found ${drivers.length} active drivers in database`);

    // 3. Kết hợp thông tin từ Redis và PostgreSQL
    const result = drivers.map(driver => {
      const redisInfo = nearbyDrivers.find(d => d.driverId === driver.userId);
      return {
        driverId: driver.userId,
        fullName: driver.fullName,
        vehicleType: driver.vehicleType,
        vehicleModel: driver.vehicleModel,
        vehicleColor: driver.vehicleColor,
        vehiclePlate: driver.vehiclePlate,
        rating: driver.rating,
        distance: redisInfo ? redisInfo.distance : null, // Trả về meters
      };
    });

    // Sắp xếp theo khoảng cách tăng dần
    return result.sort((a, b) => (a.distance || 0) - (b.distance || 0));
  } catch (error) {
    this.logger.error(`Error finding nearby drivers: ${error.message}`);
    return []; // Luôn trả về mảng rỗng thay vì throw
  }
}
  async getOnlineDriversCount(): Promise<number> {
    try {
      const redisClient = this.redisService.getClient();
      const count = await redisClient.zcard('driver:locations');
      this.logger.log(`Online drivers count: ${count}`);
      return count;
    } catch (error) {
      this.logger.error(`Error getting online drivers count: ${error.message}`);
      return 0;
    }
  }

  async isDriverOnline(userId: string): Promise<boolean> {
    try {
      const location = await this.redisService.getDriverLocation(userId);
      return location !== null;
    } catch (error) {
      return false;
    }
  }
}