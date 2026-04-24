import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '@cab-booking/shared';
import { ConfigService } from '@nestjs/config';
import { Driver, DriverAccountStatus, DriverOnlineStatus } from '../entities/driver.entity';
import { UpdateDriverDto, DriverLocationDto, DriverResponseDto } from '../dto/driver.dto';
import axios from 'axios';

@Injectable()
export class DriverService {
  private readonly logger = new Logger(DriverService.name);

  constructor(
    @InjectRepository(Driver)
    private driverRepository: Repository<Driver>,
    private redisService: RedisService,
    private configService: ConfigService,
  ) {}

  async getDriverByUserId(userId: string): Promise<DriverResponseDto> {
    const driver = await this.driverRepository.findOne({
      where: { userId },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    const location = await this.redisService.getDriverLocation(driver.userId);
    
    return {
      id: driver.id,
      userId: driver.userId,
      fullName: driver.fullName,
      email: driver.email,
      phone: driver.phone,
      avatar: driver.avatar,
      accountStatus: driver.accountStatus,
      onlineStatus: driver.onlineStatus,
      vehicleType: driver.vehicleType,
      vehicleModel: driver.vehicleModel,
      vehicleColor: driver.vehicleColor,
      vehiclePlate: driver.vehiclePlate,
      totalTrips: driver.totalTrips,
      rating: driver.rating,
      currentLocation: location ? {
        lat: location.lat,
        lng: location.lng,
        updatedAt: new Date(),
      } : undefined,
      lastActiveAt: driver.lastActiveAt,
      createdAt: driver.createdAt,
      updatedAt: driver.updatedAt,
    };
  }

  async approveDriver(userId: string): Promise<DriverResponseDto> {
    const driver = await this.driverRepository.findOne({
      where: { userId },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    if (driver.accountStatus !== DriverAccountStatus.PENDING) {
      throw new BadRequestException('Driver is not in pending status');
    }

    // ✅ Gọi sang Auth Service để approve user
    const authServiceUrl = this.configService.get('AUTH_SERVICE_URL', 'http://localhost:3001');
    const internalKey = this.configService.get('INTERNAL_API_KEY', 'internal-key');
    
    try {
      await axios.patch(
        `${authServiceUrl}/api/v1/internal/users/${userId}/approve`,
        {},
        {
          headers: {
            'x-service-id': 'driver-service',
            'x-internal-key': internalKey,
          },
          timeout: 5000,
        }
      );
      this.logger.log(`✅ User ${userId} approved in Auth Service`);
    } catch (error: any) {
      this.logger.error(`Failed to approve user in Auth Service: ${error.message}`);
      if (error.response) {
        this.logger.error(`Response: ${JSON.stringify(error.response.data)}`);
      }
      throw new BadRequestException('Failed to approve driver. Please try again.');
    }

    // ✅ Cập nhật accountStatus trong Driver Service
    driver.accountStatus = DriverAccountStatus.ACTIVE;
    await this.driverRepository.save(driver);

    this.logger.log(`✅ Driver approved for userId: ${userId}`);

    return {
      id: driver.id,
      userId: driver.userId,
      fullName: driver.fullName,
      email: driver.email,
      phone: driver.phone,
      avatar: driver.avatar,
      accountStatus: driver.accountStatus,
      onlineStatus: driver.onlineStatus,
      vehicleType: driver.vehicleType,
      vehicleModel: driver.vehicleModel,
      vehicleColor: driver.vehicleColor,
      vehiclePlate: driver.vehiclePlate,
      totalTrips: driver.totalTrips,
      rating: driver.rating,
      currentLocation: driver.currentLocation,
      lastActiveAt: driver.lastActiveAt,
      createdAt: driver.createdAt,
      updatedAt: driver.updatedAt,
    };
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

    return {
      id: driver.id,
      userId: driver.userId,
      fullName: driver.fullName,
      email: driver.email,
      phone: driver.phone,
      avatar: driver.avatar,
      accountStatus: driver.accountStatus,
      onlineStatus: driver.onlineStatus,
      vehicleType: driver.vehicleType,
      vehicleModel: driver.vehicleModel,
      vehicleColor: driver.vehicleColor,
      vehiclePlate: driver.vehiclePlate,
      totalTrips: driver.totalTrips,
      rating: driver.rating,
      currentLocation: driver.currentLocation,
      lastActiveAt: driver.lastActiveAt,
      createdAt: driver.createdAt,
      updatedAt: driver.updatedAt,
    };
  }

  async updateLocation(userId: string, locationDto: DriverLocationDto): Promise<void> {
    await this.redisService.setDriverLocation(
      userId,
      locationDto.latitude,
      locationDto.longitude,
    );

    const redisClient = this.redisService.getClient();
    await redisClient.setex(`driver:status:${userId}`, 3600, 'online');

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

    this.logger.log(`📍 Driver ${userId} location updated`);
  }

  async updateOnlineStatus(userId: string, status: string): Promise<DriverResponseDto> {
    const driver = await this.driverRepository.findOne({
      where: { userId },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    if (driver.accountStatus !== DriverAccountStatus.ACTIVE) {
      throw new BadRequestException('Tài khoản tài xế chưa được duyệt. Vui lòng chờ admin xác nhận.');
    }

    let newOnlineStatus: DriverOnlineStatus;
    const redisClient = this.redisService.getClient();

    switch (status) {
      case 'online':
        newOnlineStatus = DriverOnlineStatus.ONLINE;
        await redisClient.setex(`driver:status:${userId}`, 3600, 'online');
        break;
      case 'offline':
        newOnlineStatus = DriverOnlineStatus.OFFLINE;
        await redisClient.del(`driver:status:${userId}`);
        await this.redisService.removeDriverLocation(userId);
        break;
      case 'busy':
        newOnlineStatus = DriverOnlineStatus.BUSY;
        await redisClient.setex(`driver:status:${userId}`, 3600, 'busy');
        break;
      default:
        newOnlineStatus = driver.onlineStatus;
    }

    driver.onlineStatus = newOnlineStatus;
    await this.driverRepository.save(driver);

    this.logger.log(`Driver ${userId} online status updated to ${newOnlineStatus}`);

    return {
      id: driver.id,
      userId: driver.userId,
      fullName: driver.fullName,
      email: driver.email,
      phone: driver.phone,
      avatar: driver.avatar,
      accountStatus: driver.accountStatus,
      onlineStatus: driver.onlineStatus,
      vehicleType: driver.vehicleType,
      vehicleModel: driver.vehicleModel,
      vehicleColor: driver.vehicleColor,
      vehiclePlate: driver.vehiclePlate,
      totalTrips: driver.totalTrips,
      rating: driver.rating,
      currentLocation: driver.currentLocation,
      lastActiveAt: driver.lastActiveAt,
      createdAt: driver.createdAt,
      updatedAt: driver.updatedAt,
    };
  }

  async findNearbyDrivers(
    latitude: number,
    longitude: number,
    radius: number = 5000,
  ): Promise<any[]> {
    try {
      this.logger.log(`Finding nearby drivers at (${latitude}, ${longitude}) within ${radius}m`);

      const nearbyDrivers = await this.redisService.getNearbyDrivers(
        latitude,
        longitude,
        radius,
      );

      this.logger.log(`Found ${nearbyDrivers.length} drivers in Redis`);

      if (nearbyDrivers.length === 0) {
        return [];
      }

      const driverIds = nearbyDrivers.map(d => d.driverId);
      
      const drivers = await this.driverRepository
        .createQueryBuilder('driver')
        .where('driver.userId IN (:...driverIds)', { driverIds })
        .andWhere('driver.accountStatus = :accStatus', { accStatus: DriverAccountStatus.ACTIVE })
        .andWhere('driver.onlineStatus = :onlineStatus', { onlineStatus: DriverOnlineStatus.ONLINE })
        .getMany();

      this.logger.log(`Found ${drivers.length} active drivers in database`);

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
          distance: redisInfo ? redisInfo.distance : null,
        };
      });

      return result.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    } catch (error) {
      this.logger.error(`Error finding nearby drivers: ${error.message}`);
      return [];
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

  async createDriver(data: any) {
    const driver = this.driverRepository.create({
      userId: data.userId,
      email: data.email,
      fullName: data.fullName,
      phone: data.phone,
      accountStatus: DriverAccountStatus.PENDING,
      onlineStatus: DriverOnlineStatus.OFFLINE,
    });
    return this.driverRepository.save(driver);
  }
}