import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService, RabbitMQService } from '@cab-booking/shared';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AIClientService } from './ai-client.service';
import { MATCHING_CONFIG, REDIS_KEYS } from '../constants/matching.constants';
import { RABBITMQ_EXCHANGES, ROUTING_KEYS } from '@cab-booking/shared';
import { 
  MatchingRequestDto, 
} from '../dto/matching.dto';
import { NearbyDriver, ScoredDriver, DriverInfo } from '../interfaces/driver.interface';

interface PriceDetails {
  basePrice: number;
  distancePrice: number;
  timePrice: number;
  surgeMultiplier: number;
  total: number;
  currency: string;
}

@Injectable()
export class MatchingService implements OnModuleInit {
  private readonly logger = new Logger(MatchingService.name);
  private readonly activeMatchings: Map<string, NodeJS.Timeout> = new Map();
  private readonly driverResponseTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private redisService: RedisService,
    private rabbitMQService: RabbitMQService,
    private configService: ConfigService,
    private httpService: HttpService,
    private aiClientService: AIClientService,
  ) {}

  async onModuleInit() {
    await this.subscribeToEvents();
    this.logger.log('✅ Matching Service initialized');
  }

  private async subscribeToEvents() {
    await this.rabbitMQService.subscribe(
      'matching.booking-created.queue',
      async (msg: any) => {
        await this.handleBookingCreated(msg);
      },
      {
        exchange: RABBITMQ_EXCHANGES.BOOKING_EVENTS,
        routingKey: ROUTING_KEYS.BOOKING_CREATED,
      },
    );

    await this.rabbitMQService.subscribe(
      'matching.booking-cancelled.queue',
      async (msg: any) => {
        await this.handleBookingCancelled(msg);
      },
      {
        exchange: RABBITMQ_EXCHANGES.BOOKING_EVENTS,
        routingKey: ROUTING_KEYS.BOOKING_CANCELLED,
      },
    );

    await this.rabbitMQService.subscribe(
      'matching.driver-response.queue',
      async (msg: any) => {
        await this.handleDriverResponse(msg);
      },
      {
        exchange: RABBITMQ_EXCHANGES.MATCHING_EVENTS,
        routingKey: 'driver.response.*',
      },
    );

    this.logger.log('📡 Subscribed to events with dedicated queues');
  }

  private async handleBookingCreated(event: any) {
    this.logger.log(`📨 Received booking.created event: ${JSON.stringify(event)}`);

    try {
      const { bookingId, customerId, pickupLocation, dropoffLocation, vehicleType, distance, estimatedPrice } = event.data || event;

      const matchingRequest: MatchingRequestDto = {
        bookingId,
        customerId,
        vehicleType,
        distance,
        pickupLocation,
        dropoffLocation,
        searchRadius: MATCHING_CONFIG.DEFAULT_SEARCH_RADIUS,
        estimatedPrice: estimatedPrice || 0
      };

      await this.startMatching(matchingRequest);

    } catch (error) {
      this.logger.error(`Error handling booking.created: ${error.message}`);
    }
  }

  private async handleBookingCancelled(event: any) {
    this.logger.log(`📨 Received booking.cancelled event: ${JSON.stringify(event)}`);

    try {
      const { bookingId } = event.data || event;
      
      const timeout = this.activeMatchings.get(bookingId);
      if (timeout) {
        clearTimeout(timeout);
        this.activeMatchings.delete(bookingId);
      }

      await this.redisService.del(REDIS_KEYS.PENDING_BOOKING(bookingId));

      this.logger.log(`✅ Cancelled matching for booking ${bookingId}`);

    } catch (error) {
      this.logger.error(`Error handling booking.cancelled: ${error.message}`);
    }
  }

  private async handleDriverResponse(event: any) {
    this.logger.log(`📨 Received driver response: ${JSON.stringify(event)}`);

    try {
      const response = event.data || event;
      const { driverId, bookingId, accepted, eta, reason } = response;

      if (!driverId || !bookingId) {
        this.logger.error('Missing driverId or bookingId in response');
        return;
      }

      this.logger.log(`Driver ${driverId} ${accepted ? 'ACCEPTED' : 'REJECTED'} booking ${bookingId}`);

      const timeoutKey = `${bookingId}:${driverId}`;
      const timeout = this.driverResponseTimeouts.get(timeoutKey);
      if (timeout) {
        clearTimeout(timeout);
        this.driverResponseTimeouts.delete(timeoutKey);
      }

      if (accepted) {
        await this.handleDriverAccepted(driverId, bookingId, eta);
      } else {
        await this.handleDriverRejected(driverId, bookingId, reason);
      }

    } catch (error) {
      this.logger.error(`Error handling driver response: ${error.message}`);
    }
  }

  private async startMatching(request: MatchingRequestDto) {
    const { bookingId, pickupLocation, searchRadius } = request;

    this.logger.log(`🚀 Starting matching for booking ${bookingId} at (${pickupLocation.lat}, ${pickupLocation.lng})`);

    await this.rabbitMQService.publish(
      RABBITMQ_EXCHANGES.MATCHING_EVENTS,
      ROUTING_KEYS.MATCHING_STARTED,
      {
        bookingId,
        timestamp: new Date().toISOString(),
      },
    );

    await this.redisService.set(
      REDIS_KEYS.PENDING_BOOKING(bookingId),
      request,
      300,
    );

    const nearbyDrivers = await this.findNearbyDrivers(
      pickupLocation.lat,
      pickupLocation.lng,
      (searchRadius || MATCHING_CONFIG.DEFAULT_SEARCH_RADIUS) * 1000,
    );

    this.logger.log(`Found ${nearbyDrivers.length} nearby drivers`);

    if (nearbyDrivers.length === 0) {
      await this.expandSearchRadius(request, 1);
      return;
    }

    const driversWithInfo = await this.enrichDriversWithInfo(nearbyDrivers);
    const scoredDrivers = await this.scoreDriversWithAI(driversWithInfo, request);
    const bestDriver = scoredDrivers[0];

    if (!bestDriver) {
      await this.handleNoDriverFound(bookingId);
      return;
    }

    this.logger.log(`🎯 Selected driver ${bestDriver.driverId} with score ${bestDriver.score}`);

    await this.sendRequestToDriver(bestDriver, request);
  }

  // ✅ DÙNG AI ĐỂ TÍNH ĐIỂM
  private async scoreDriversWithAI(drivers: ScoredDriver[], request: MatchingRequestDto): Promise<ScoredDriver[]> {
    for (const driver of drivers) {
      try {
        const distanceKm = driver.distance / 1000;
        const aiScore = await this.aiClientService.getDriverScoreFromAI(
          distanceKm,
          driver.rating,
          driver.acceptanceRate,
          driver.totalTrips,
        );
        
        driver.score = aiScore / 100;
        
        this.logger.debug(`🤖 AI Score for driver ${driver.driverId}: ${aiScore} (distance=${driver.distance}m)`);
      } catch (error) {
        this.logger.warn(`AI scoring failed for ${driver.driverId}, using fallback`);
        driver.score = this.calculateFallbackScore(driver, drivers);
      }
    }

    return drivers.sort((a, b) => b.score - a.score);
  }

  private calculateFallbackScore(driver: ScoredDriver, allDrivers: ScoredDriver[]): number {
    const weights = MATCHING_CONFIG.WEIGHTS;
    const maxDistance = Math.max(...allDrivers.map(d => d.distance));
    const maxRating = 5.0;
    const maxTrips = Math.max(...allDrivers.map(d => d.totalTrips));
    const maxAcceptance = Math.max(...allDrivers.map(d => d.acceptanceRate));

    const distanceScore = maxDistance > 0 ? 1 - (driver.distance / maxDistance) : 1;
    const ratingScore = driver.rating / maxRating;
    const experienceScore = maxTrips > 0 ? driver.totalTrips / maxTrips : 0.5;
    const acceptanceScore = maxAcceptance > 0 ? driver.acceptanceRate / maxAcceptance : 0.8;

    return distanceScore * weights.DISTANCE +
           ratingScore * weights.RATING +
           acceptanceScore * weights.ACCEPTANCE_RATE +
           experienceScore * weights.EXPERIENCE;
  }

  private async findNearbyDrivers(lat: number, lng: number, radius: number): Promise<NearbyDriver[]> {
    try {
      const nearbyDrivers = await this.redisService.getNearbyDrivers(lat, lng, radius);
      const availableDrivers: NearbyDriver[] = [];

      for (const driver of nearbyDrivers) {
        const status = await this.redisService.get(REDIS_KEYS.DRIVER_STATUS(driver.driverId));
        
        if (status === 'online' || status === 'available') {
          availableDrivers.push({
            driverId: driver.driverId,
            distance: driver.distance,
          });
        }
      }

      return availableDrivers;
    } catch (error) {
      this.logger.error(`Error finding nearby drivers: ${error.message}`);
      return [];
    }
  }

  private async enrichDriversWithInfo(drivers: NearbyDriver[]): Promise<ScoredDriver[]> {
    const enriched: ScoredDriver[] = [];

    for (const driver of drivers) {
      try {
        let driverInfo = await this.redisService.get<DriverInfo>(
          REDIS_KEYS.DRIVER_INFO(driver.driverId)
        );

        if (!driverInfo) {
          driverInfo = await this.fetchDriverInfo(driver.driverId);
          
          if (driverInfo) {
            await this.redisService.set(
              REDIS_KEYS.DRIVER_INFO(driver.driverId),
              driverInfo,
              3600,
            );
          }
        }

        if (driverInfo) {
          enriched.push({
            ...driver,
            score: 0,
            rating: driverInfo.rating || 5.0,
            totalTrips: driverInfo.totalTrips || 0,
            vehicleType: driverInfo.vehicleType,
            acceptanceRate: driverInfo.acceptanceRate || 0.8,
          });
        }
      } catch (error) {
        this.logger.error(`Error enriching driver ${driver.driverId}: ${error.message}`);
      }
    }

    return enriched;
  }

  private async fetchDriverInfo(driverId: string): Promise<DriverInfo | null> {
    try {
      const driverServiceUrl = this.configService.get('DRIVER_SERVICE_URL', 'http://localhost:3003');
      
      const response: any = await firstValueFrom(
        this.httpService.get(`${driverServiceUrl}/api/v1/internal/drivers/${driverId}`, {
          headers: {
            'x-service-id': 'matching-service',
            'x-internal-key': this.configService.get('INTERNAL_API_KEY', 'internal-key'),
          },
        })
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching driver info: ${error.message}`);
      return null;
    }
  }

  private async sendRequestToDriver(driver: ScoredDriver, request: MatchingRequestDto) {
    const { bookingId, pickupLocation, dropoffLocation, estimatedPrice } = request;

    this.logger.log(`📤 Sending request to driver ${driver.driverId} for booking ${bookingId}`);

    const redisClient = this.redisService.getClient();
    await redisClient.setex(
      `driver:current:${driver.driverId}`,
      60,
      JSON.stringify({
        bookingId,
        pickupLocation,
        dropoffLocation,
        price: estimatedPrice || 0
      })
    );

    await this.rabbitMQService.publish(
      RABBITMQ_EXCHANGES.MATCHING_EVENTS,
      ROUTING_KEYS.MATCHING_REQUEST,
      {
        driverId: driver.driverId,
        bookingId,
        pickupLocation,
        dropoffLocation,
        price: estimatedPrice,
        eta: Math.round(driver.distance / 500),
        expiresIn: 60
      }
    );

    const timeoutKey = `${bookingId}:${driver.driverId}`;
    const timeout = setTimeout(
      () => this.handleDriverNoResponse(driver.driverId, bookingId),
      MATCHING_CONFIG.DRIVER_RESPONSE_TIMEOUT * 1000,
    );
    this.driverResponseTimeouts.set(timeoutKey, timeout);

    const matchingTimeout = setTimeout(
      () => this.handleMatchingTimeout(bookingId),
      MATCHING_CONFIG.MATCHING_TIMEOUT * 1000,
    );
    this.activeMatchings.set(bookingId, matchingTimeout);
  }

  private async handleDriverAccepted(driverId: string, bookingId: string, eta: number) {
    this.logger.log(`✅ Driver ${driverId} accepted booking ${bookingId}`);

    const timeout = this.activeMatchings.get(bookingId);
    if (timeout) {
      clearTimeout(timeout);
      this.activeMatchings.delete(bookingId);
    }

    const bookingInfo = await this.redisService.get<MatchingRequestDto>(
      REDIS_KEYS.PENDING_BOOKING(bookingId)
    );

    const priceDetails: PriceDetails = {
      basePrice: 20000,
      distancePrice: 0,
      timePrice: 0,
      surgeMultiplier: 1,
      total: 0,
      currency: 'VND'
    };

    if (bookingInfo) {
      const pricePerKm = 10000;
      const pricePerMinute = 2000;
      const distance = bookingInfo.distance || 0;
      const estimatedDuration = Math.round(distance * 2);
      
      priceDetails.basePrice = 20000;
      priceDetails.distancePrice = Math.round(distance * pricePerKm);
      priceDetails.timePrice = Math.round(estimatedDuration * pricePerMinute);
      priceDetails.surgeMultiplier = 1;
      priceDetails.total = Math.round(20000 + (distance * pricePerKm) + (estimatedDuration * pricePerMinute));
    }

    await this.updateBookingWithDriver(bookingId, driverId, eta, priceDetails);

    await this.rabbitMQService.publish(
      RABBITMQ_EXCHANGES.BOOKING_EVENTS,
      'booking.accepted',
      {
        bookingId,
        customerId: bookingInfo?.customerId,
        driverId,
        pickupLocation: bookingInfo?.pickupLocation,
        dropoffLocation: bookingInfo?.dropoffLocation,
        price: priceDetails,
        distance: bookingInfo?.distance || 0,
        eta: eta || 5,
        timestamp: new Date().toISOString(),
      }
    );

    await this.rabbitMQService.publish(
      RABBITMQ_EXCHANGES.MATCHING_EVENTS,
      ROUTING_KEYS.MATCHING_DRIVER_ACCEPTED,
      {
        bookingId,
        driverId,
        eta,
        price: priceDetails,
        timestamp: new Date().toISOString()
      }
    );
  }

  private async handleDriverRejected(driverId: string, bookingId: string, reason: any) {
    this.logger.log(`❌ Driver ${driverId} rejected booking ${bookingId}`);

    await this.rabbitMQService.publish(
      RABBITMQ_EXCHANGES.MATCHING_EVENTS,
      ROUTING_KEYS.MATCHING_DRIVER_REJECTED,
      {
        bookingId,
        driverId,
        timestamp: new Date().toISOString(),
      },
    );
  }

  private async handleDriverNoResponse(driverId: string, bookingId: string) {
    this.logger.log(`⏰ Driver ${driverId} did not respond for booking ${bookingId}`);

    this.driverResponseTimeouts.delete(`${bookingId}:${driverId}`);

    const bookingInfo = await this.redisService.get<MatchingRequestDto>(
      REDIS_KEYS.PENDING_BOOKING(bookingId)
    );

    if (bookingInfo) {
      await this.startMatching(bookingInfo);
    }
  }

  private async handleMatchingTimeout(bookingId: string) {
    this.logger.log(`⏰ Matching timeout for booking ${bookingId}`);

    this.activeMatchings.delete(bookingId);

    const bookingInfo = await this.redisService.get<MatchingRequestDto>(
      REDIS_KEYS.PENDING_BOOKING(bookingId)
    );

    if (bookingInfo) {
      await this.expandSearchRadius(bookingInfo, 1);
    }
  }

  private async expandSearchRadius(request: MatchingRequestDto, attempt: number) {
    const { bookingId, searchRadius } = request;

    if (attempt >= MATCHING_CONFIG.MAX_EXPAND_ATTEMPTS) {
      this.logger.log(`❌ No drivers found after ${attempt} attempts for booking ${bookingId}`);
      await this.handleNoDriverFound(bookingId);
      return;
    }

    const newRadius = (searchRadius || MATCHING_CONFIG.DEFAULT_SEARCH_RADIUS) + MATCHING_CONFIG.SEARCH_EXPAND_STEP;
    
    if (newRadius > MATCHING_CONFIG.MAX_SEARCH_RADIUS) {
      await this.handleNoDriverFound(bookingId);
      return;
    }

    this.logger.log(`🔍 Expanding search radius to ${newRadius}km for booking ${bookingId}`);

    request.searchRadius = newRadius;
    
    await this.redisService.set(
      REDIS_KEYS.MATCHING_ATTEMPT(bookingId),
      { attempt, radius: newRadius },
      300,
    );

    await this.startMatching(request);
  }

  private async handleNoDriverFound(bookingId: string) {
    this.logger.log(`❌ No driver found for booking ${bookingId}`);

    await this.rabbitMQService.publish(
      RABBITMQ_EXCHANGES.MATCHING_EVENTS,
      ROUTING_KEYS.MATCHING_NO_DRIVER,
      {
        bookingId,
        timestamp: new Date().toISOString(),
      },
    );

    await this.updateBookingNoDriver(bookingId);

    await this.redisService.del(REDIS_KEYS.PENDING_BOOKING(bookingId));
    await this.redisService.del(REDIS_KEYS.MATCHING_ATTEMPT(bookingId));
  }

  private async updateBookingWithDriver(bookingId: string, driverId: string, eta: number, price: PriceDetails) {
    try {
      const bookingServiceUrl = this.configService.get('BOOKING_SERVICE_URL', 'http://localhost:3004');
      
      await firstValueFrom(
        this.httpService.patch(
          `${bookingServiceUrl}/api/v1/internal/bookings/${bookingId}/assign-driver`,
          { driverId, eta, price },
          {
            headers: {
              'x-service-id': 'matching-service',
              'x-internal-key': this.configService.get('INTERNAL_API_KEY', 'internal-key'),
            },
          }
        )
      );

      this.logger.log(`✅ Updated booking ${bookingId} with driver ${driverId}`);
    } catch (error) {
      this.logger.error(`Error updating booking: ${error.message}`);
    }
  }

  private async updateBookingNoDriver(bookingId: string) {
    try {
      const bookingServiceUrl = this.configService.get('BOOKING_SERVICE_URL', 'http://localhost:3004');
      
      await firstValueFrom(
        this.httpService.patch(
          `${bookingServiceUrl}/api/v1/internal/bookings/${bookingId}/no-driver`,
          {},
          {
            headers: {
              'x-service-id': 'matching-service',
              'x-internal-key': this.configService.get('INTERNAL_API_KEY', 'internal-key'),
            },
          }
        )
      );

      this.logger.log(`✅ Updated booking ${bookingId} status to NO_DRIVER`);
    } catch (error) {
      this.logger.error(`Error updating booking no driver: ${error.message}`);
    }
  }

  async getMatchingStatus(bookingId: string): Promise<any> {
    const pending = await this.redisService.get(REDIS_KEYS.PENDING_BOOKING(bookingId));
    const attempt = await this.redisService.get(REDIS_KEYS.MATCHING_ATTEMPT(bookingId));
    const hasTimeout = this.activeMatchings.has(bookingId);

    return {
      bookingId,
      isActive: hasTimeout,
      pendingRequest: pending,
      matchingAttempt: attempt,
    };
  }
  
  async cancelMatching(bookingId: string): Promise<void> {
    const timeout = this.activeMatchings.get(bookingId);
    if (timeout) {
      clearTimeout(timeout);
      this.activeMatchings.delete(bookingId);
    }

    await this.redisService.del(REDIS_KEYS.PENDING_BOOKING(bookingId));
    await this.redisService.del(REDIS_KEYS.MATCHING_ATTEMPT(bookingId));

    this.logger.log(`✅ Cancelled matching for booking ${bookingId}`);
  }
}