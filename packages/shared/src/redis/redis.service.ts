import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redisClient: Redis;
  private readonly logger = new Logger(RedisService.name);
  private readonly GEO_KEY = 'driver:locations';

  constructor(config: RedisConfig) {
    this.redisClient = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db || 0,
      keyPrefix: '', // Không dùng prefix vì đã có trong GEO_KEY
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redisClient.on('connect', () => {
      this.logger.log('✅ Connected to Redis');
    });

    this.redisClient.on('error', (error) => {
      this.logger.error(`Redis connection error: ${error.message}`);
    });
  }

  async onModuleDestroy() {
    await this.redisClient.quit();
  }

  getClient(): Redis {
    return this.redisClient;
  }

  // ==================== GEO SPATIAL OPERATIONS ====================

  /**
   * Lưu vị trí tài xế vào Redis GEO
   */
  async setDriverLocation(
    driverId: string,
    latitude: number,
    longitude: number,
  ): Promise<boolean> {
    try {
      // GEOADD key longitude latitude member
      const result = await this.redisClient.geoadd(
        this.GEO_KEY,
        longitude,
        latitude,
        driverId
      );
      
      this.logger.debug(`📍 Driver ${driverId} location saved: ${result > 0 ? 'updated' : 'added'}`);
      return result > 0;
    } catch (error) {
      this.logger.error(`Error setting driver location: ${error.message}`);
      return false;
    }
  }

  /**
   * Lấy vị trí hiện tại của tài xế
   */
  
  /**
   * Tìm tài xế gần nhất trong bán kính (meters)
   */
  async getNearbyDrivers(
    latitude: number,
    longitude: number,
    radius: number = 5000,
    unit: 'm' | 'km' = 'm'
  ): Promise<Array<{ driverId: string; distance: number }>> {
    try {
      // GEORADIUS key longitude latitude radius unit WITHDIST
      const results = await this.redisClient.georadius(
        this.GEO_KEY,
        longitude,
        latitude,
        radius,
        unit,
        'WITHDIST'
      );

      if (!results || results.length === 0) {
        return [];
      }

      return results.map((item: any) => ({
        driverId: item[0],
        distance: parseFloat(item[1]),
      }));
    } catch (error) {
      this.logger.error(`Error getting nearby drivers: ${error.message}`);
      return [];
    }
  }
  async getDriverLocation(driverId: string): Promise<{ lat: number; lng: number } | null> {
    try {
      // GEOPOS key member
      const result = await this.redisClient.geopos(this.GEO_KEY, driverId);
      if (result && result[0]) {
        const [lng, lat] = result[0].map(coord => parseFloat(coord));
        return { lat, lng };
      }
      return null;
    } catch (error) {
      this.logger.error(`Error getting driver location: ${error.message}`);
      return null;
    }
  }
  /**
   * Xóa vị trí tài xế (khi offline)
   */
  async removeDriverLocation(driverId: string): Promise<boolean> {
    try {
      // ZREM key member
      const result = await this.redisClient.zrem(this.GEO_KEY, driverId);
      return result > 0;
    } catch (error) {
      this.logger.error(`Error removing driver location: ${error.message}`);
      return false;
    }
  }

  // ==================== GENERAL CACHE OPERATIONS ====================

  /**
   * Set giá trị cache với TTL (seconds)
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    
    if (ttl) {
      await this.redisClient.setex(key, ttl, stringValue);
    } else {
      await this.redisClient.set(key, stringValue);
    }
  }

  /**
   * Get giá trị từ cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    const value = await this.redisClient.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as any;
    }
  }

  /**
   * Xóa key khỏi cache
   */
  async del(key: string): Promise<void> {
    await this.redisClient.del(key);
  }

  /**
   * Thêm vào danh sách (list)
   */
  async lpush(key: string, ...values: any[]): Promise<void> {
    const stringValues = values.map(v => typeof v === 'string' ? v : JSON.stringify(v));
    await this.redisClient.lpush(key, ...stringValues);
  }

  /**
   * Lấy từ danh sách (list)
   */
  async lrange(key: string, start: number, stop: number): Promise<any[]> {
    const result = await this.redisClient.lrange(key, start, stop);
    return result.map(item => {
      try {
        return JSON.parse(item);
      } catch {
        return item;
      }
    });
  }
}