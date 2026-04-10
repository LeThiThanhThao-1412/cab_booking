import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface ServiceInfo {
  name: string;
  url: string;
  port: number;
  health: boolean;
  lastCheck: Date;
  routes: ServiceRoute[];
}

export interface ServiceRoute {
  method: string;
  path: string;
  targetPath: string;
  authRequired: boolean;
  roles?: string[];
}

@Injectable()
export class ServiceRegistry implements OnModuleInit {
  private readonly logger = new Logger(ServiceRegistry.name);
  private services: Map<string, ServiceInfo> = new Map();
  private healthCheckInterval: NodeJS.Timeout;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  async onModuleInit() {
    this.registerServices();
    this.startHealthCheck();
    this.logger.log('✅ Service Registry initialized');
  }

  private registerServices() {
    const services = [
      {
        name: 'auth',
        url: this.configService.get('AUTH_SERVICE_URL', 'http://localhost:3001'),
        port: 3001,
        routes: [
          { method: 'POST', path: '/auth/register', targetPath: '/api/v1/auth/register', authRequired: false },
          { method: 'POST', path: '/auth/login', targetPath: '/api/v1/auth/login', authRequired: false },
          { method: 'POST', path: '/auth/refresh', targetPath: '/api/v1/auth/refresh', authRequired: false },
          { method: 'POST', path: '/auth/logout', targetPath: '/api/v1/auth/logout', authRequired: true },
          { method: 'GET', path: '/auth/profile', targetPath: '/api/v1/auth/profile', authRequired: true },
        ],
      },
      {
        name: 'user',
        url: this.configService.get('USER_SERVICE_URL', 'http://localhost:3002'),
        port: 3002,
        routes: [
          { method: 'GET', path: '/users/profile', targetPath: '/api/v1/users/profile', authRequired: true },
          { method: 'PATCH', path: '/users/profile', targetPath: '/api/v1/users/profile', authRequired: true },
          { method: 'POST', path: '/users/places', targetPath: '/api/v1/users/places', authRequired: true },
          { method: 'DELETE', path: '/users/places/:name', targetPath: '/api/v1/users/places/:name', authRequired: true },
        ],
      },
      {
        name: 'driver',
        url: this.configService.get('DRIVER_SERVICE_URL', 'http://localhost:3003'),
        port: 3003,
        routes: [
          { method: 'GET', path: '/drivers/profile', targetPath: '/api/v1/drivers/profile', authRequired: true, roles: ['driver'] },
          { method: 'PATCH', path: '/drivers/profile', targetPath: '/api/v1/drivers/profile', authRequired: true, roles: ['driver'] },
          { method: 'PATCH', path: '/drivers/status', targetPath: '/api/v1/drivers/status', authRequired: true, roles: ['driver'] },
          { method: 'PATCH', path: '/drivers/location', targetPath: '/api/v1/drivers/location', authRequired: true, roles: ['driver'] },
          { method: 'GET', path: '/drivers/nearby', targetPath: '/api/v1/drivers/nearby', authRequired: true },
        ],
      },
      {
        name: 'booking',
        url: this.configService.get('BOOKING_SERVICE_URL', 'http://localhost:3004'),
        port: 3004,
        routes: [
          { method: 'POST', path: '/bookings', targetPath: '/api/v1/bookings', authRequired: true },
          { method: 'GET', path: '/bookings', targetPath: '/api/v1/bookings', authRequired: true },
          { method: 'GET', path: '/bookings/:id', targetPath: '/api/v1/bookings/:id', authRequired: true },
          { method: 'PATCH', path: '/bookings/:id/accept', targetPath: '/api/v1/bookings/:id/accept', authRequired: true, roles: ['driver'] },
          { method: 'PATCH', path: '/bookings/:id/status', targetPath: '/api/v1/bookings/:id/status', authRequired: true, roles: ['driver'] },
        ],
      },
      {
        name: 'ride',
        url: this.configService.get('RIDE_SERVICE_URL', 'http://localhost:3005'),
        port: 3005,
        routes: [
          { method: 'GET', path: '/rides/:id', targetPath: '/api/v1/rides/:id', authRequired: true },
          { method: 'GET', path: '/rides/driver/active', targetPath: '/api/v1/rides/driver/active', authRequired: true, roles: ['driver'] },
          { method: 'GET', path: '/rides/customer/active', targetPath: '/api/v1/rides/customer/active', authRequired: true },
          { method: 'PATCH', path: '/rides/:id/location', targetPath: '/api/v1/rides/:id/location', authRequired: true, roles: ['driver'] },
          { method: 'PATCH', path: '/rides/:id/status', targetPath: '/api/v1/rides/:id/status', authRequired: true, roles: ['driver'] },
          { method: 'POST', path: '/rides/:id/rate', targetPath: '/api/v1/rides/:id/rate', authRequired: true },
        ],
      },
      {
        name: 'payment',
        url: this.configService.get('PAYMENT_SERVICE_URL', 'http://localhost:3007'),
        port: 3007,
        routes: [
          { method: 'GET', path: '/payments/ride/:rideId', targetPath: '/api/v1/payments/ride/:rideId', authRequired: true },
          { method: 'GET', path: '/payments/transaction/:transactionId', targetPath: '/api/v1/payments/transaction/:transactionId', authRequired: true },
          { method: 'POST', path: '/payments/apply-coupon', targetPath: '/api/v1/payments/apply-coupon', authRequired: true },
          { method: 'POST', path: '/payments/:paymentId/refund', targetPath: '/api/v1/payments/:paymentId/refund', authRequired: true },
        ],
      },
      {
        name: 'pricing',
        url: this.configService.get('PRICING_SERVICE_URL', 'http://localhost:3008'),
        port: 3008,
        routes: [
          { method: 'POST', path: '/pricing/calculate', targetPath: '/api/v1/pricing/calculate', authRequired: true },
          { method: 'POST', path: '/pricing/apply-coupon', targetPath: '/api/v1/pricing/apply-coupon', authRequired: true },
          { method: 'GET', path: '/pricing/base-prices', targetPath: '/api/v1/pricing/base-prices', authRequired: true },
        ],
      },
      {
        name: 'notification',
        url: this.configService.get('NOTIFICATION_SERVICE_URL', 'http://localhost:3009'),
        port: 3009,
        routes: [
          { method: 'GET', path: '/notifications', targetPath: '/api/v1/notifications', authRequired: true },
          { method: 'GET', path: '/notifications/unread/count', targetPath: '/api/v1/notifications/unread/count', authRequired: true },
          { method: 'PUT', path: '/notifications/read', targetPath: '/api/v1/notifications/read', authRequired: true },
          { method: 'PUT', path: '/notifications/read/all', targetPath: '/api/v1/notifications/read/all', authRequired: true },
          { method: 'DELETE', path: '/notifications/:id', targetPath: '/api/v1/notifications/:id', authRequired: true },
        ],
      },
      {
        name: 'review',
        url: this.configService.get('REVIEW_SERVICE_URL', 'http://localhost:3010'),
        port: 3010,
        routes: [
          { method: 'POST', path: '/reviews', targetPath: '/api/v1/reviews', authRequired: true },
          { method: 'GET', path: '/reviews/user/:userId', targetPath: '/api/v1/reviews/user/:userId', authRequired: true },
          { method: 'GET', path: '/reviews/ride/:rideId', targetPath: '/api/v1/reviews/ride/:rideId', authRequired: true },
          { method: 'GET', path: '/reviews/stats/:userId', targetPath: '/api/v1/reviews/stats/:userId', authRequired: true },
          { method: 'GET', path: '/reviews/my-stats', targetPath: '/api/v1/reviews/my-stats', authRequired: true },
          { method: 'DELETE', path: '/reviews/:id', targetPath: '/api/v1/reviews/:id', authRequired: true },
        ],
      },
    ];

    for (const service of services) {
      this.services.set(service.name, {
        ...service,
        health: true,
        lastCheck: new Date(),
      });
      this.logger.log(`Registered service: ${service.name} at ${service.url}`);
    }
  }

  private startHealthCheck() {
    const interval = this.configService.get('HEALTH_CHECK_INTERVAL', 30000);
    this.healthCheckInterval = setInterval(() => this.checkHealth(), interval);
  }

  private async checkHealth() {
    for (const [name, service] of this.services) {
      try {
        const response = await firstValueFrom(
          this.httpService.get(`${service.url}/api/v1/internal/health`, {
            timeout: 5000,
            headers: {
              'x-service-id': 'api-gateway',
              'x-internal-key': this.configService.get('INTERNAL_API_KEY', 'internal-key'),
            },
          })
        );
        
        if (response.data?.status === 'ok') {
          service.health = true;
        } else {
          service.health = false;
        }
      } catch (error) {
        service.health = false;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(`Health check failed for ${name}: ${errorMessage}`);
      }
      service.lastCheck = new Date();
    }
  }

  findRoute(path: string, method: string): { service: ServiceInfo; route: ServiceRoute } | null {
    // Loại bỏ prefix /api/v1
    const cleanPath = path.replace(/^\/api\/v1/, '');
    
    for (const service of this.services.values()) {
      for (const route of service.routes) {
        if (this.matchRoute(route.path, cleanPath) && route.method === method) {
          return { service, route };
        }
      }
    }
    return null;
  }

  private matchRoute(routePath: string, requestPath: string): boolean {
    const routeParts = routePath.split('/').filter(p => p);
    const requestParts = requestPath.split('/').filter(p => p);
    
    if (routeParts.length !== requestParts.length) return false;
    
    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) continue;
      if (routeParts[i] !== requestParts[i]) return false;
    }
    return true;
  }

  buildTargetUrl(service: ServiceInfo, route: ServiceRoute, originalPath: string): string {
    // Loại bỏ prefix /api/v1
    const cleanPath = originalPath.replace(/^\/api\/v1/, '');
    const routeParts = route.path.split('/').filter(p => p);
    const requestParts = cleanPath.split('/').filter(p => p);
    let targetUrl = service.url + route.targetPath;
    
    // Replace path parameters
    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        const paramName = routeParts[i].slice(1);
        const paramValue = requestParts[i];
        targetUrl = targetUrl.replace(`:${paramName}`, paramValue);
      }
    }
    
    return targetUrl;
  }

  getService(name: string): ServiceInfo | undefined {
    return this.services.get(name);
  }

  getAllServices(): ServiceInfo[] {
    return Array.from(this.services.values());
  }

  getHealthyServices(): ServiceInfo[] {
    return Array.from(this.services.values()).filter(s => s.health);
  }
}